import { S3Service } from '@/common/s3/s3.service'
import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { OrderStatus } from '@prisma/client'
import { CreateReviewDto } from './dto/review.dto'

@Injectable()
export class ReviewsService {
	constructor(
		private prisma: PrismaService,
		private s3Service: S3Service,
	) {}

	async create(authorId: string, dto: CreateReviewDto) {
		const order = await this.prisma.order.findUnique({
			where: { id: dto.orderId },
			include: { review: true },
		})

		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== authorId)
			throw new ForbiddenException('Нет доступа')
		if (order.status !== OrderStatus.COMPLETED) {
			throw new BadRequestException(
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
			// Use updateMany to avoid P2025 if profile row is missing
			this.prisma.freelancerProfile.updateMany({
				where: { userId: order.freelancerId },
				data: {
					rating: profileStats._avg.rating ?? 0,
					reviewsCount: profileStats._count,
				},
			}),
		])

		return this.withSignedAvatars(review)
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
		const signed = await Promise.all(
			data.map(item => this.withSignedAvatars(item)),
		)
		return { data: signed, total, page, limit }
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
		const signed = await Promise.all(
			data.map(item => this.withSignedAvatars(item)),
		)
		return { data: signed, total, page, limit }
	}

	/** Отзывы, полученные фрилансером (по всем его услугам) */
	async findForFreelancer(freelancerId: string, page = 1, limit = 20) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.review.findMany({
				where: { service: { freelancerId } },
				include: {
					author: { select: { id: true, name: true, avatar: true } },
					service: {
						select: {
							id: true,
							title: true,
							freelancer: { select: { id: true, name: true, avatar: true } },
						},
					},
				},
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.review.count({ where: { service: { freelancerId } } }),
		])
		const signed = await Promise.all(
			data.map(item => this.withSignedAvatars(item)),
		)
		return { data: signed, total, page, limit }
	}

	private async withSignedAvatars<
		T extends {
			author?: { avatar?: string | null }
			service?: { freelancer?: { avatar?: string | null } }
		},
	>(review: T): Promise<T> {
		const authorAvatar = await this.s3Service.signUrl(
			review.author?.avatar ?? undefined,
		)
		const freelancerAvatar = await this.s3Service.signUrl(
			review.service?.freelancer?.avatar ?? undefined,
		)
		return {
			...review,
			author: review.author
				? { ...review.author, avatar: authorAvatar ?? null }
				: review.author,
			service: review.service
				? {
						...review.service,
						freelancer: review.service.freelancer
							? {
									...review.service.freelancer,
									avatar: freelancerAvatar ?? null,
								}
							: review.service.freelancer,
					}
				: review.service,
		}
	}
}
