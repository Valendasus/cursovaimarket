import { PrismaService } from '@/prisma/prisma.service'
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { OrderStatus } from '@prisma/client'
import { CreateReviewDto } from './dto/review.dto'

@Injectable()
export class ReviewsService {
	constructor(private prisma: PrismaService) {}

	async create(authorId: string, dto: CreateReviewDto) {
		const order = await this.prisma.order.findUnique({
			where: { id: dto.orderId },
			include: { review: true },
		})

		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== authorId)
			throw new ForbiddenException('Нет доступа')
		if (order.status !== OrderStatus.COMPLETED) {
			throw new ForbiddenException(
				'Можно оставить отзыв только по завершённому заказу',
			)
		}
		if (order.review) {
			throw new ConflictException('Отзыв уже оставлен')
		}

		const review = await this.prisma.review.create({
			data: {
				authorId,
				serviceId: order.serviceId,
				orderId: dto.orderId,
				rating: dto.rating,
				comment: dto.comment,
			},
			include: {
				author: { select: { id: true, name: true, avatar: true } },
			},
		})

		// Recalculate service rating
		const stats = await this.prisma.review.aggregate({
			where: { serviceId: order.serviceId },
			_avg: { rating: true },
			_count: true,
		})

		// Recalculate freelancer profile rating (across ALL their services)
		const profileStats = await this.prisma.review.aggregate({
			where: { service: { freelancerId: order.freelancerId } },
			_avg: { rating: true },
			_count: true,
		})

		await Promise.all([
			this.prisma.service.update({
				where: { id: order.serviceId },
				data: {
					rating: stats._avg.rating ?? 0,
					reviewsCount: stats._count,
				},
			}),
			this.prisma.freelancerProfile.update({
				where: { userId: order.freelancerId },
				data: {
					rating: profileStats._avg.rating ?? 0,
					reviewsCount: profileStats._count,
				},
			}),
		])

		return review
	}

	async findForService(serviceId: string, page = 1, limit = 10) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.review.findMany({
				where: { serviceId },
				include: {
					author: { select: { id: true, name: true, avatar: true } },
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.review.count({ where: { serviceId } }),
		])
		return { data, total, page, limit }
	}

	/** Отзывы, написанные пользователем (история студента) */
	async findByAuthor(authorId: string, page = 1, limit = 20) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.review.findMany({
				where: { authorId },
				include: {
					service: {
						select: {
							id: true,
							title: true,
							freelancer: {
								select: { id: true, name: true, avatar: true },
							},
						},
					},
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.review.count({ where: { authorId } }),
		])
		return { data, total, page, limit }
	}

	/** Отзывы, полученные фрилансером (по всем его услугам) */
	async findForFreelancer(freelancerId: string, page = 1, limit = 20) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.review.findMany({
				where: { service: { freelancerId } },
				include: {
					author: { select: { id: true, name: true, avatar: true } },
					service: { select: { id: true, title: true } },
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.review.count({ where: { service: { freelancerId } } }),
		])
		return { data, total, page, limit }
	}
}
