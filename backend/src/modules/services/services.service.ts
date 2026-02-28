import { PrismaService } from '@/prisma/prisma.service'
import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
	CreateServiceDto,
	ServiceFiltersDto,
	UpdateServiceDto,
} from './dto/service.dto'

@Injectable()
export class ServicesService {
	constructor(private prisma: PrismaService) {}

	async findAll(filters: ServiceFiltersDto) {
		const {
			category,
			level,
			search,
			page = 1,
			limit = 12,
			freelancerId,
		} = filters
		const skip = (page - 1) * limit

		const where: Prisma.ServiceWhereInput = {
			...(category && { category }),
			...(level && { level }),
			...(freelancerId && { freelancerId }),
			...(search && {
				OR: [
					{ title: { contains: search, mode: 'insensitive' } },
					{ description: { contains: search, mode: 'insensitive' } },
					{ tags: { has: search } },
				],
			}),
		}

		const [data, total] = await Promise.all([
			this.prisma.service.findMany({
				where,
				include: {
					freelancer: {
						select: { id: true, name: true, avatar: true, profile: true },
					},
					packages: { orderBy: { price: 'asc' } },
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.service.count({ where }),
		])

		return { data, total, page, limit }
	}

	async findOne(id: string) {
		const service = await this.prisma.service.findUnique({
			where: { id },
			include: {
				freelancer: {
					select: { id: true, name: true, avatar: true, profile: true },
				},
				packages: { orderBy: { price: 'asc' } },
				reviews: {
					include: {
						author: { select: { id: true, name: true, avatar: true } },
					},
					orderBy: { createdAt: 'desc' },
					take: 10,
				},
			},
		})
		if (!service) throw new NotFoundException('Услуга не найдена')
		return service
	}

	async create(freelancerId: string, dto: CreateServiceDto) {
		const { packages, ...serviceData } = dto
		const service = await this.prisma.service.create({
			data: {
				...serviceData,
				freelancerId,
				packages: { create: packages },
			},
			include: { packages: true },
		})
		return service
	}

	async update(id: string, userId: string, dto: UpdateServiceDto) {
		const service = await this.prisma.service.findUnique({ where: { id } })
		if (!service) throw new NotFoundException('Услуга не найдена')
		if (service.freelancerId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}
		return this.prisma.service.update({
			where: { id },
			data: dto,
			include: { packages: true },
		})
	}

	async remove(id: string, userId: string) {
		const service = await this.prisma.service.findUnique({ where: { id } })
		if (!service) throw new NotFoundException('Услуга не найдена')
		if (service.freelancerId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}
		await this.prisma.service.delete({ where: { id } })
		return { message: 'Услуга удалена' }
	}
}
