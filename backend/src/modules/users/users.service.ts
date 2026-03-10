import { PrismaService } from '@/prisma/prisma.service'
import {
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	async findById(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id },
			include: { profile: true },
		})
		if (!user) throw new NotFoundException('Пользователь не найден')
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = user
		return safe
	}

	async findFreelancers(page = 1, limit = 12) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.user.findMany({
				where: { role: UserRole.FREELANCER },
				include: {
					profile: true,
					services: { select: { id: true, rating: true } },
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.user.count({ where: { role: UserRole.FREELANCER } }),
		])

		const safe = data.map(({ password, ...u }) => u)
		return { data: safe, total, page, limit }
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
		return safe
	}

	async updateProfile(userId: string, dto: UpdateProfileDto) {
		const profile = await this.prisma.freelancerProfile.upsert({
			where: { userId },
			create: { userId, ...dto },
			update: dto,
		})
		return profile
	}
}
