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

		await this.prisma.service.update({
			where: { id: order.serviceId },
			data: {
				rating: stats._avg.rating ?? 0,
				reviewsCount: stats._count,
			},
		})

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
}
