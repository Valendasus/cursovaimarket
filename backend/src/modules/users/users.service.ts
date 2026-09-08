import { S3Service } from '@/common/s3/s3.service'
import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import {
	SwitchRoleDto,
	UpdateProfileDto,
	UpdateUserDto,
} from './dto/update-user.dto'

@Injectable()
export class UsersService {
	constructor(
		private prisma: PrismaService,
		private s3Service: S3Service,
	) {}

	async findMe(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id },
			include: { profile: true },
		})
		if (!user) throw new NotFoundException('Пользователь не найден')
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = user
		return this.withSignedAvatar(safe)
	}

	async findPublicById(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				avatar: true,
				role: true,
				createdAt: true,
				profile: true,
			},
		})
		if (!user) throw new NotFoundException('Пользователь не найден')
		return this.withSignedAvatar(user)
	}

	async findById(id: string) {
		return this.findPublicById(id)
	}

	async findFreelancers(page = 1, limit = 12) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.user.findMany({
				where: { role: UserRole.FREELANCER },
				select: {
					id: true,
					name: true,
					avatar: true,
					role: true,
					createdAt: true,
					profile: true,
					services: { select: { id: true, rating: true } },
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.user.count({ where: { role: UserRole.FREELANCER } }),
		])

		const signed = await Promise.all(
			data.map(user => this.withSignedAvatar(user)),
		)
		return { data: signed, total, page, limit }
	}

	async updateMe(userId: string, dto: UpdateUserDto) {
		if (dto.name) {
			const taken = await this.prisma.user.findUnique({
				where: { name: dto.name },
			})
			if (taken && taken.id !== userId) {
				throw new ConflictException(
					'Пользователь с таким никнеймом уже существует',
				)
			}
		}
		const user = await this.prisma.user.update({
			where: { id: userId },
			data: dto,
			include: { profile: true },
		})
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = user
		return this.withSignedAvatar(safe)
	}

	async updateProfile(userId: string, dto: UpdateProfileDto) {
		const profile = await this.prisma.freelancerProfile.upsert({
			where: { userId },
			create: { userId, ...dto },
			update: dto,
		})
		return profile
	}

	async updateAvatar(userId: string, avatar: string) {
		const user = await this.prisma.user.update({
			where: { id: userId },
			data: { avatar },
			include: { profile: true },
		})
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = user
		return this.withSignedAvatar(safe)
	}

	async switchRole(userId: string, dto: SwitchRoleDto) {
		if (dto.role !== UserRole.STUDENT && dto.role !== UserRole.FREELANCER) {
			throw new BadRequestException(
				'Можно переключаться только между ролями STUDENT и FREELANCER',
			)
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: { profile: true },
		})
		if (!user) throw new NotFoundException('Пользователь не найден')
		if (user.role === dto.role) {
			throw new BadRequestException('У вас уже установлена эта роль')
		}

		// Switch role; if becoming FREELANCER — ensure profile exists
		// Toggle service visibility based on new role
		const [updated] = await this.prisma.$transaction([
			this.prisma.user.update({
				where: { id: userId },
				data: {
					role: dto.role,
					...(dto.role === UserRole.FREELANCER && !user.profile
						? { profile: { create: {} } }
						: {}),
				},
				include: { profile: true },
			}),
			this.prisma.service.updateMany({
				where: { freelancerId: userId },
				data: { isActive: dto.role === UserRole.FREELANCER },
			}),
		])

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = updated
		return this.withSignedAvatar(safe)
	}

	private async withSignedAvatar<T extends { avatar?: string | null }>(
		user: T,
	): Promise<T> {
		const avatar = await this.s3Service.signUrl(user.avatar ?? undefined)
		return { ...user, avatar: avatar ?? null }
	}
}
