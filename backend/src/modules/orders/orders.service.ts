import { S3Service } from '@/common/s3/s3.service'
import { PaymentsService } from '@/modules/payments/payments.service'
import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
	ServiceUnavailableException,
} from '@nestjs/common'
import {
	DeadlineExtensionStatus,
	Order,
	OrderStatus,
	PaymentStatus,
	Prisma,
	RefundRequestStatus,
	UserRole,
} from '@prisma/client'
import {
	CreateDeadlineExtensionDto,
	CreateOrderDto,
	CreateRefundRequestDto,
	ResolveDeadlineExtensionDto,
	UpdateOrderStatusDto,
} from './dto/order.dto'

const CONFIRM_TIMEOUT_HOURS = 24
const DAY_MS = 24 * 60 * 60 * 1000

const ORDER_INCLUDE = {
	service: { select: { id: true, title: true, images: true } },
	package: true,
	student: { select: { id: true, name: true, avatar: true } },
	freelancer: { select: { id: true, name: true, avatar: true } },
	review: true,
	payment: true,
	payout: true,
	refundRequests: {
		orderBy: { createdAt: 'desc' as const },
		take: 1,
		select: {
			id: true,
			reason: true,
			status: true,
			createdAt: true,
		},
	},
	deadlineExtensions: {
		orderBy: { createdAt: 'desc' as const },
		take: 1,
		select: {
			id: true,
			additionalDays: true,
			reason: true,
			status: true,
			createdAt: true,
			resolvedAt: true,
		},
	},
} satisfies Prisma.OrderInclude

@Injectable()
export class OrdersService {
	private readonly logger = new Logger(OrdersService.name)

	constructor(
		private prisma: PrismaService,
		private s3Service: S3Service,
		private payments: PaymentsService,
	) {}

	async create(studentId: string, dto: CreateOrderDto) {
		const pkg = await this.prisma.servicePackage.findUnique({
			where: { id: dto.packageId },
			include: { service: true },
		})
		if (!pkg) throw new NotFoundException('Пакет не найден')
		if (!pkg.service.isActive || pkg.service.deletedAt) {
			throw new BadRequestException('Услуга недоступна для заказа')
		}
		if (pkg.service.freelancerId === studentId) {
			throw new BadRequestException('Нельзя заказать собственную услугу')
		}

		const order = await this.prisma.order.create({
			data: {
				studentId,
				freelancerId: pkg.service.freelancerId,
				serviceId: pkg.service.id,
				packageId: pkg.id,
				totalPrice: pkg.price,
				packageName: pkg.name,
				packageDescription: pkg.description,
				packageDeliveryDays: pkg.deliveryDays,
				packageRevisions: pkg.revisions,
				packageFeatures: pkg.features,
				requirements: dto.requirements,
				status: OrderStatus.PENDING,
				confirmDeadline: new Date(
					Date.now() + CONFIRM_TIMEOUT_HOURS * 60 * 60 * 1000,
				),
			},
			include: ORDER_INCLUDE,
		})

		return this.present(order)
	}

	async findMyOrders(userId: string, role: UserRole) {
		if (role !== UserRole.STUDENT && role !== UserRole.FREELANCER) {
			throw new ForbiddenException('Для этой роли список заказов недоступен')
		}
		const where =
			role === UserRole.FREELANCER
				? { freelancerId: userId }
				: { studentId: userId }

		await this.expireStaleOrders(where)
		const orders = await this.prisma.order.findMany({
			where,
			include: ORDER_INCLUDE,
			orderBy: { createdAt: 'desc' },
		})
		return Promise.all(orders.map((order) => this.present(order)))
	}

	async findOne(id: string, userId: string) {
		await this.expireStaleOrders({ id })
		const order = await this.prisma.order.findUnique({
			where: { id },
			include: ORDER_INCLUDE,
		})
		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== userId && order.freelancerId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}
		return this.present(order)
	}

	async confirm(id: string, userId: string, role: UserRole) {
		this.requireRole(role, UserRole.FREELANCER)
		await this.expireStaleOrders({ id })
		const order = await this.prisma.order.findUnique({ where: { id } })
		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.freelancerId !== userId) {
			throw new ForbiddenException('Подтвердить заказ может только исполнитель')
		}
		if (order.status !== OrderStatus.PENDING) {
			throw new BadRequestException(
				order.status === OrderStatus.CANCELLED
					? 'Заказ отменён — срок подтверждения истёк'
					: 'Заказ уже подтверждён',
			)
		}
		const changed = await this.prisma.order.updateMany({
			where: { id, status: OrderStatus.PENDING },
			data: { status: OrderStatus.AWAITING_PAYMENT, confirmedAt: new Date() },
		})
		if (changed.count !== 1) {
			throw new ConflictException('Статус заказа уже изменился')
		}
		return this.findOne(id, userId)
	}

	async pay(id: string, userId: string, role: UserRole) {
		this.requireRole(role, UserRole.STUDENT)
		let order = await this.prisma.order.findUnique({ where: { id } })
		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== userId) {
			throw new ForbiddenException('Оплатить заказ может только заказчик')
		}
		if (
			order.status !== OrderStatus.AWAITING_PAYMENT &&
			order.status !== OrderStatus.PAYMENT_PROCESSING
		) {
			throw new BadRequestException(
				order.status === OrderStatus.PENDING
					? 'Заказ ещё не подтверждён исполнителем'
					: 'Заказ не в статусе ожидания оплаты',
			)
		}

		if (order.status === OrderStatus.AWAITING_PAYMENT) {
			const claimed = await this.prisma.order.updateMany({
				where: { id, status: OrderStatus.AWAITING_PAYMENT },
				data: { status: OrderStatus.PAYMENT_PROCESSING },
			})
			if (claimed.count !== 1) {
				throw new ConflictException('Оплата заказа уже запущена')
			}
			order = { ...order, status: OrderStatus.PAYMENT_PROCESSING }
		}

		const result = await this.payments.charge(order)
		if (result === 'PROCESSING') {
			throw new ServiceUnavailableException(
				'Оплата ещё обрабатывается. Повторите проверку немного позже',
			)
		}
		if (result === 'FAILED') {
			await this.prisma.order.updateMany({
				where: { id, status: OrderStatus.PAYMENT_PROCESSING },
				data: { status: OrderStatus.AWAITING_PAYMENT },
			})
			this.logger.warn(`Оплата заказа ${id} не прошла — остаётся в ожидании`)
			return this.findOne(id, userId)
		}

		const startedAt = new Date()
		const changed = await this.prisma.order.updateMany({
			where: { id, status: OrderStatus.PAYMENT_PROCESSING },
			data: {
				status: OrderStatus.IN_PROGRESS,
				deadline: new Date(
					startedAt.getTime() + order.packageDeliveryDays * DAY_MS,
				),
			},
		})
		if (changed.count !== 1) {
			throw new ConflictException('Статус заказа изменился во время оплаты')
		}
		return this.findOne(id, userId)
	}

	async updateStatus(
		id: string,
		userId: string,
		role: UserRole,
		dto: UpdateOrderStatusDto,
	) {
		let order = await this.prisma.order.findUnique({ where: { id } })
		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.freelancerId !== userId && order.studentId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}

		const terminalStatuses: OrderStatus[] = [
			OrderStatus.COMPLETED,
			OrderStatus.CANCELLED,
		]
		if (terminalStatuses.includes(order.status)) {
			throw new BadRequestException(
				'Завершённый или отменённый заказ менять нельзя',
			)
		}

		const isFreelancer =
			role === UserRole.FREELANCER && order.freelancerId === userId
		const isStudent = role === UserRole.STUDENT && order.studentId === userId

		if (dto.status === OrderStatus.CANCELLED) {
			const cancelableStatuses: OrderStatus[] = [
				OrderStatus.PENDING,
				OrderStatus.AWAITING_PAYMENT,
			]
			if (!cancelableStatuses.includes(order.status)) {
				throw new BadRequestException('Оплаченный заказ отменить нельзя')
			}
			const freelancerMayReject =
				isFreelancer && order.status === OrderStatus.PENDING
			if (!isStudent && !freelancerMayReject) {
				throw new ForbiddenException('Отменить заказ может только заказчик')
			}
			await this.changeStatusOnce(id, order.status, OrderStatus.CANCELLED)
			return this.findOne(id, userId)
		}

		const allowedForFreelancer: OrderStatus[] = [
			OrderStatus.IN_PROGRESS,
			OrderStatus.REVIEW,
		]
		const allowedForStudent: OrderStatus[] = [
			OrderStatus.REVISION,
			OrderStatus.COMPLETED,
		]
		if (isFreelancer) {
			if (!allowedForFreelancer.includes(dto.status)) {
				throw new ForbiddenException('Недопустимый статус для фрилансера')
			}
		} else if (isStudent) {
			if (!allowedForStudent.includes(dto.status)) {
				throw new ForbiddenException('Недопустимый статус для заказчика')
			}
		} else {
			throw new ForbiddenException('Текущая роль не разрешает это действие')
		}

		if (dto.status === OrderStatus.COMPLETED) {
			if (
				order.status !== OrderStatus.REVIEW &&
				order.status !== OrderStatus.COMPLETING
			) {
				throw new BadRequestException(
					'Завершить можно только заказ на проверке',
				)
			}
			if (order.status === OrderStatus.REVIEW) {
				await this.changeStatusOnce(
					id,
					OrderStatus.REVIEW,
					OrderStatus.COMPLETING,
				)
				order = { ...order, status: OrderStatus.COMPLETING }
			}
			return this.completeAfterPayout(order, userId)
		}

		const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
			[OrderStatus.ACCEPTED]: [OrderStatus.IN_PROGRESS],
			[OrderStatus.IN_PROGRESS]: [OrderStatus.REVIEW],
			[OrderStatus.REVIEW]: [OrderStatus.REVISION],
			[OrderStatus.REVISION]: [OrderStatus.IN_PROGRESS],
		}
		if (!(validTransitions[order.status] ?? []).includes(dto.status)) {
			throw new BadRequestException(
				`Переход из статуса ${order.status} в ${dto.status} недопустим`,
			)
		}
		await this.changeStatusOnce(id, order.status, dto.status)
		return this.findOne(id, userId)
	}

	async requestDeadlineExtension(
		id: string,
		userId: string,
		role: UserRole,
		dto: CreateDeadlineExtensionDto,
	) {
		this.requireRole(role, UserRole.FREELANCER)
		const order = await this.prisma.order.findUnique({ where: { id } })
		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.freelancerId !== userId)
			throw new ForbiddenException('Нет доступа')
		const extendableStatuses: OrderStatus[] = [
			OrderStatus.IN_PROGRESS,
			OrderStatus.REVISION,
		]
		if (!extendableStatuses.includes(order.status)) {
			throw new BadRequestException(
				'Для этого заказа нельзя запросить продление',
			)
		}
		if (!order.deadline || order.deadline.getTime() > Date.now()) {
			throw new BadRequestException(
				'Запросить продление можно после истечения срока заказа',
			)
		}
		try {
			return await this.prisma.deadlineExtensionRequest.create({
				data: {
					orderId: id,
					requesterId: userId,
					additionalDays: dto.additionalDays,
					reason: dto.reason.trim(),
					activeKey: id,
				},
			})
		} catch (error) {
			if (this.isUniqueConflict(error)) {
				throw new ConflictException(
					'По заказу уже ожидается решение о продлении',
				)
			}
			throw error
		}
	}

	async resolveDeadlineExtension(
		id: string,
		requestId: string,
		userId: string,
		role: UserRole,
		dto: ResolveDeadlineExtensionDto,
	) {
		this.requireRole(role, UserRole.STUDENT)
		return this.prisma.$transaction(async (tx) => {
			const request = await tx.deadlineExtensionRequest.findUnique({
				where: { id: requestId },
				include: { order: true },
			})
			if (!request || request.orderId !== id) {
				throw new NotFoundException('Запрос на продление не найден')
			}
			if (request.order.studentId !== userId) {
				throw new ForbiddenException('Решение принимает только заказчик')
			}
			if (request.status !== DeadlineExtensionStatus.PENDING) {
				throw new ConflictException('Решение по запросу уже принято')
			}

			const changed = await tx.deadlineExtensionRequest.updateMany({
				where: {
					id: requestId,
					status: DeadlineExtensionStatus.PENDING,
					activeKey: id,
				},
				data: {
					status: dto.approved
						? DeadlineExtensionStatus.APPROVED
						: DeadlineExtensionStatus.REJECTED,
					activeKey: null,
					resolvedAt: new Date(),
					resolvedById: userId,
				},
			})
			if (changed.count !== 1) {
				throw new ConflictException('Решение по запросу уже принято')
			}

			if (dto.approved) {
				const base = Math.max(
					Date.now(),
					request.order.deadline?.getTime() ?? Date.now(),
				)
				await tx.order.update({
					where: { id },
					data: {
						deadline: new Date(base + request.additionalDays * DAY_MS),
					},
				})
			}
			return tx.deadlineExtensionRequest.findUnique({
				where: { id: requestId },
			})
		})
	}

	async createRefundRequest(
		orderId: string,
		userId: string,
		role: UserRole,
		dto: CreateRefundRequestDto,
	) {
		this.requireRole(role, UserRole.STUDENT)
		const order = await this.prisma.order.findUnique({
			where: { id: orderId },
			include: {
				service: { select: { id: true, title: true } },
				student: { select: { id: true, name: true, email: true } },
				freelancer: { select: { id: true, name: true, email: true } },
				payment: true,
				payout: true,
				messages: {
					select: { id: true, senderId: true, content: true, createdAt: true },
					orderBy: { createdAt: 'asc' },
				},
			},
		})
		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== userId) {
			throw new ForbiddenException('Возврат может запросить только заказчик')
		}
		if (order.payment?.status !== PaymentStatus.SUCCEEDED) {
			throw new BadRequestException('По заказу нет подтверждённой оплаты')
		}
		const refundableStatuses: OrderStatus[] = [
			OrderStatus.IN_PROGRESS,
			OrderStatus.REVIEW,
			OrderStatus.REVISION,
		]
		if (!refundableStatuses.includes(order.status)) {
			throw new BadRequestException('На этом этапе возврат запросить нельзя')
		}
		if (
			dto.reason === 'MISSED_DEADLINE' &&
			(!order.deadline || order.deadline.getTime() > Date.now())
		) {
			throw new BadRequestException('Срок выполнения заказа ещё не истёк')
		}

		const contextSnapshot = {
			orderId: order.id,
			status: order.status,
			service: order.service,
			package: {
				id: order.packageId,
				name: order.packageName,
				description: order.packageDescription,
				deliveryDays: order.packageDeliveryDays,
				revisions: order.packageRevisions,
				features: order.packageFeatures,
				price: order.totalPrice,
			},
			requirements: order.requirements,
			deadline: order.deadline?.toISOString(),
			createdAt: order.createdAt.toISOString(),
			student: order.student,
			freelancer: order.freelancer,
			payment: {
				status: order.payment.status,
				amount: order.payment.amount,
				fee: order.payment.fee,
				paidAt: order.payment.paidAt?.toISOString(),
			},
			payout: order.payout
				? { status: order.payout.status, amount: order.payout.amount }
				: null,
			orderMessages: order.messages.map(message => ({
				id: message.id,
				senderId: message.senderId,
				content: message.content,
				createdAt: message.createdAt.toISOString(),
			})),
		}

		try {
			return await this.prisma.refundRequest.create({
				data: {
					orderId,
					requesterId: userId,
					reason: dto.reason,
					message: dto.message.trim(),
					activeKey: orderId,
					contextSnapshot,
				},
				select: {
					id: true,
					orderId: true,
					reason: true,
					message: true,
					status: true,
					createdAt: true,
				},
			})
		} catch (error) {
			if (this.isUniqueConflict(error)) {
				throw new ConflictException('Запрос на возврат уже рассматривается')
			}
			throw error
		}
	}

	findRefundRequestsForAdmin(status?: RefundRequestStatus) {
		return this.prisma.refundRequest.findMany({
			where: status ? { status } : undefined,
			include: {
				requester: { select: { id: true, name: true, email: true } },
				order: {
					include: {
						service: { select: { id: true, title: true } },
						student: { select: { id: true, name: true, email: true } },
						freelancer: { select: { id: true, name: true, email: true } },
						payment: true,
						payout: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		})
	}

	async findRefundRequestForAdmin(id: string) {
		const request = await this.prisma.refundRequest.findUnique({
			where: { id },
			include: {
				requester: { select: { id: true, name: true, email: true } },
				resolvedBy: { select: { id: true, name: true, email: true } },
				order: {
					include: {
						service: true,
						student: { select: { id: true, name: true, email: true } },
						freelancer: { select: { id: true, name: true, email: true } },
						payment: true,
						payout: true,
						messages: {
							include: {
								sender: { select: { id: true, name: true, email: true } },
							},
							orderBy: { createdAt: 'asc' },
						},
						deadlineExtensions: { orderBy: { createdAt: 'desc' } },
					},
				},
			},
		})
		if (!request) throw new NotFoundException('Запрос на возврат не найден')
		return request
	}

	private async completeAfterPayout(order: Order, userId: string) {
		const payment = await this.prisma.payment.findUnique({
			where: { orderId: order.id },
		})
		if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
			await this.restoreReview(order.id)
			throw new BadRequestException(
				'Нельзя завершить заказ: оплата не подтверждена',
			)
		}

		const payout = await this.payments.sendPayout(order)
		if (payout === 'PROCESSING') {
			throw new ServiceUnavailableException(
				'Выплата ещё обрабатывается. Повторите проверку немного позже',
			)
		}
		if (payout === 'FAILED') {
			await this.restoreReview(order.id)
			throw new ServiceUnavailableException(
				'Выплата исполнителю не прошла. Заказ оставлен на проверке',
			)
		}

		await this.prisma.$transaction(async (tx) => {
			const changed = await tx.order.updateMany({
				where: { id: order.id, status: OrderStatus.COMPLETING },
				data: { status: OrderStatus.COMPLETED },
			})
			if (changed.count !== 1) {
				throw new ConflictException('Заказ уже был завершён другим запросом')
			}
			await tx.freelancerProfile.updateMany({
				where: { userId: order.freelancerId },
				data: { completedOrders: { increment: 1 } },
			})
			await tx.service.update({
				where: { id: order.serviceId },
				data: { ordersCount: { increment: 1 } },
			})
		})
		return this.findOne(order.id, userId)
	}

	private async restoreReview(id: string) {
		await this.prisma.order.updateMany({
			where: { id, status: OrderStatus.COMPLETING },
			data: { status: OrderStatus.REVIEW },
		})
	}

	private async changeStatusOnce(
		id: string,
		from: OrderStatus,
		to: OrderStatus,
	) {
		const changed = await this.prisma.order.updateMany({
			where: { id, status: from },
			data: { status: to },
		})
		if (changed.count !== 1) {
			throw new ConflictException('Статус заказа уже изменился')
		}
	}

	private async expireStaleOrders(scope: {
		id?: string
		studentId?: string
		freelancerId?: string
	}) {
		const { count } = await this.prisma.order.updateMany({
			where: {
				...scope,
				status: OrderStatus.PENDING,
				confirmDeadline: { not: null, lt: new Date() },
			},
			data: { status: OrderStatus.CANCELLED },
		})
		if (count > 0) this.logger.log(`Отменено просроченных заказов: ${count}`)
	}

	private requireRole(actual: UserRole, expected: UserRole) {
		if (actual !== expected) {
			throw new ForbiddenException('Текущая роль не разрешает это действие')
		}
	}

	private isUniqueConflict(error: unknown): boolean {
		return Boolean(
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2002',
		)
	}

	private async present<T extends Record<string, any>>(order: T): Promise<T> {
		const studentAvatar = await this.s3Service.signUrl(
			order.student?.avatar ?? undefined,
		)
		const freelancerAvatar = await this.s3Service.signUrl(
			order.freelancer?.avatar ?? undefined,
		)
		return {
			...order,
			package: {
				id: order.packageId,
				name: order.packageName,
				description: order.packageDescription,
				price: order.totalPrice,
				deliveryDays: order.packageDeliveryDays,
				revisions: order.packageRevisions,
				features: order.packageFeatures,
			},
			student: order.student
				? { ...order.student, avatar: studentAvatar ?? null }
				: order.student,
			freelancer: order.freelancer
				? { ...order.freelancer, avatar: freelancerAvatar ?? null }
				: order.freelancer,
		} as T
	}
}
