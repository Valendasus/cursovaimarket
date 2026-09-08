import { S3Service } from '@/common/s3/s3.service'
import { PaymentsService } from '@/modules/payments/payments.service'
import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common'
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client'
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto'

/** Сколько у исполнителя есть на подтверждение заказа */
const CONFIRM_TIMEOUT_HOURS = 24

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
		if (!pkg.service.isActive)
			throw new BadRequestException('Услуга недоступна для заказа')
		if (pkg.service.freelancerId === studentId)
			throw new BadRequestException('Нельзя заказать собственную услугу')

		const confirmDeadline = new Date(
			Date.now() + CONFIRM_TIMEOUT_HOURS * 60 * 60 * 1000,
		)

		const order = await this.prisma.order.create({
			data: {
				studentId,
				freelancerId: pkg.service.freelancerId,
				serviceId: pkg.service.id,
				packageId: dto.packageId,
				totalPrice: pkg.price,
				requirements: dto.requirements,
				status: OrderStatus.PENDING,
				confirmDeadline,
			},
			include: {
				service: true,
				package: true,
				student: { select: { id: true, name: true, avatar: true } },
				freelancer: { select: { id: true, name: true, avatar: true } },
			},
		})

		return this.withSignedAvatars(order)
	}

	async findMyOrders(userId: string, role: UserRole) {
		const where =
			role === UserRole.FREELANCER
				? { freelancerId: userId }
				: { studentId: userId }

		await this.expireStaleOrders(where)

		const orders = await this.prisma.order.findMany({
			where,
			include: {
				service: { select: { id: true, title: true, images: true } },
				package: true,
				student: { select: { id: true, name: true, avatar: true } },
				freelancer: { select: { id: true, name: true, avatar: true } },
				review: true,
				payment: true,
				payout: true,
			},
			orderBy: { createdAt: 'desc' },
		})
		return Promise.all(orders.map(order => this.withSignedAvatars(order)))
	}

	async findOne(id: string, userId: string) {
		await this.expireStaleOrders({ id })

		const order = await this.prisma.order.findUnique({
			where: { id },
			include: {
				service: true,
				package: true,
				student: { select: { id: true, name: true, avatar: true } },
				freelancer: { select: { id: true, name: true, avatar: true } },
				review: true,
				payment: true,
				payout: true,
			},
		})

		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== userId && order.freelancerId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}

		return this.withSignedAvatars(order)
	}

	/**
	 * Подтверждение заказа исполнителем: PENDING → ACCEPTED, затем списание
	 * с заказчика и, если оно прошло, выплата исполнителю.
	 *
	 * Отказ в оплате — ожидаемый исход, а не ошибка: заказ отменяется, и клиент
	 * читает причину из order.payment.failureReason. Исключение здесь ломало бы
	 * инвалидацию кэша на фронте и заказ висел бы PENDING в интерфейсе, будучи
	 * уже отменённым в базе.
	 */
	async confirm(id: string, userId: string) {
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

		await this.prisma.order.update({
			where: { id },
			data: { status: OrderStatus.ACCEPTED, confirmedAt: new Date() },
		})

		const paid = await this.payments.charge(order)

		if (!paid) {
			await this.prisma.order.update({
				where: { id },
				data: { status: OrderStatus.CANCELLED },
			})
			this.logger.warn(`Заказ ${id} отменён: оплата не прошла`)
		}

		return this.findOne(id, userId)
	}

	/**
	 * Отменяет заказы, которые исполнитель не подтвердил за отведённое время.
	 * Планировщика в проекте нет, поэтому проверяем при чтении — этого хватает:
	 * просроченный заказ всё равно виден только через эти же методы.
	 *
	 * Деньги на этапе PENDING ещё не списаны, поэтому возврат не нужен.
	 * Заказы без confirmDeadline (созданные до появления оплаты) не трогаем.
	 */
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
		if (count > 0) {
			this.logger.log(`Отменено просроченных заказов: ${count}`)
		}
	}

	async updateStatus(id: string, userId: string, dto: UpdateOrderStatusDto) {
		const order = await this.prisma.order.findUnique({ where: { id } })
		if (!order) throw new NotFoundException('Заказ не найден')

		if (order.freelancerId !== userId && order.studentId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}

		// Terminal statuses — no further transitions allowed
		const terminal: OrderStatus[] = [
			OrderStatus.COMPLETED,
			OrderStatus.CANCELLED,
		]
		if (terminal.includes(order.status)) {
			throw new BadRequestException(
				`Нельзя изменить статус: заказ уже ${order.status === OrderStatus.COMPLETED ? 'завершён' : 'отменён'}`,
			)
		}

		// Role-based transition rules
		const isFreelancer = order.freelancerId === userId
		const isStudent = order.studentId === userId
		const allowedForFreelancer: OrderStatus[] = [
			OrderStatus.IN_PROGRESS,
			OrderStatus.REVIEW,
			OrderStatus.CANCELLED,
		]
		const allowedForStudent: OrderStatus[] = [
			OrderStatus.REVISION,
			OrderStatus.COMPLETED,
			OrderStatus.CANCELLED,
		]

		if (isFreelancer && !allowedForFreelancer.includes(dto.status)) {
			throw new ForbiddenException('Недопустимый статус для фрилансера')
		}
		if (isStudent && !allowedForStudent.includes(dto.status)) {
			throw new ForbiddenException('Недопустимый статус для заказчика')
		}

		// Sequential transition validation
		const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
			// Из PENDING в работу напрямую нельзя: единственный путь вперёд —
			// confirm(), который депонирует средства.
			[OrderStatus.PENDING]: [OrderStatus.CANCELLED],
			[OrderStatus.ACCEPTED]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
			[OrderStatus.IN_PROGRESS]: [OrderStatus.REVIEW],
			[OrderStatus.REVIEW]: [OrderStatus.COMPLETED, OrderStatus.REVISION],
			[OrderStatus.REVISION]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
		}
		const allowedNext = validTransitions[order.status] ?? []
		if (!allowedNext.includes(dto.status)) {
			throw new BadRequestException(
				`Переход из статуса ${order.status} в ${dto.status} недопустим`,
			)
		}

		// Работа не начинается, пока деньги не депонированы в эскроу
		if (dto.status === OrderStatus.IN_PROGRESS) {
			const payment = await this.prisma.payment.findUnique({
				where: { orderId: id },
			})
			if (payment && payment.status !== PaymentStatus.SUCCEEDED) {
				throw new BadRequestException(
					'Нельзя взять заказ в работу: оплата не прошла',
				)
			}
		}

		// При отмене заказа: возврат средств из эскроу заказчику (если они были списаны)
		if (dto.status === OrderStatus.CANCELLED) {
			await this.payments.refund(order)
		}

		// При завершении заказа: переводим средства исполнителю из эскроу
		if (dto.status === OrderStatus.COMPLETED) {
			const payment = await this.prisma.payment.findUnique({
				where: { orderId: id },
			})
			if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
				throw new BadRequestException(
					'Нельзя завершить заказ: оплата не подтверждена',
				)
			}
			await this.payments.sendPayout(order)
		}

		const updated = await this.prisma.order.update({
			where: { id },
			data: { status: dto.status },
			include: {
				service: { select: { id: true, title: true } },
				package: true,
				student: { select: { id: true, name: true, avatar: true } },
				freelancer: { select: { id: true, name: true, avatar: true } },
				review: true,
				payment: true,
				payout: true,
			},
		})

		// When completed — increment counters
		if (dto.status === OrderStatus.COMPLETED) {
			await Promise.all([
				// completedOrders on freelancer profile
				// Use updateMany to avoid P2025 if profile row is missing
				this.prisma.freelancerProfile.updateMany({
					where: { userId: order.freelancerId },
					data: { completedOrders: { increment: 1 } },
				}),
				// ordersCount on service
				this.prisma.service.update({
					where: { id: order.serviceId },
					data: { ordersCount: { increment: 1 } },
				}),
			])
		}

		return this.withSignedAvatars(updated)
	}

	private async withSignedAvatars<
		T extends {
			student?: { avatar?: string | null }
			freelancer?: { avatar?: string | null }
		},
	>(order: T): Promise<T> {
		const studentAvatar = await this.s3Service.signUrl(
			order.student?.avatar ?? undefined,
		)
		const freelancerAvatar = await this.s3Service.signUrl(
			order.freelancer?.avatar ?? undefined,
		)
		return {
			...order,
			student: order.student
				? { ...order.student, avatar: studentAvatar ?? null }
				: order.student,
			freelancer: order.freelancer
				? { ...order.freelancer, avatar: freelancerAvatar ?? null }
				: order.freelancer,
		}
	}
}
