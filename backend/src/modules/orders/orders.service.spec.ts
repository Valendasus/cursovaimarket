/// <reference types="jest" />
import {
	BadRequestException,
	ForbiddenException,
	ServiceUnavailableException,
} from '@nestjs/common'
import {
	DeadlineExtensionStatus,
	OrderStatus,
	PaymentStatus,
	RefundReason,
	UserRole,
} from '@prisma/client'
import { OrdersService } from './orders.service'

interface TestOrder {
	id: string
	studentId: string
	freelancerId: string
	serviceId: string
	packageId: string
	totalPrice: number
	packageName: string
	packageDescription: string | null
	packageDeliveryDays: number
	packageRevisions: number
	packageFeatures: string[]
	requirements: string | null
	status: OrderStatus
	deadline: Date | null
	confirmDeadline: Date | null
	confirmedAt: Date | null
	createdAt: Date
}

const ORDER: TestOrder = {
	id: 'order_1',
	studentId: 'student_1',
	freelancerId: 'freelancer_1',
	serviceId: 'service_1',
	packageId: 'pkg_1',
	totalPrice: 300_000,
	packageName: 'Стандарт',
	packageDescription: 'Условия на момент заказа',
	packageDeliveryDays: 10,
	packageRevisions: 2,
	packageFeatures: ['Расчёты', 'Пояснения'],
	requirements: 'Требования',
	status: OrderStatus.PENDING,
	deadline: null,
	confirmDeadline: new Date(Date.now() + 3_600_000),
	confirmedAt: null,
	createdAt: new Date(),
}

function build(orderPatch: Partial<TestOrder> = {}, payment: unknown = null) {
	const current: TestOrder & Record<string, any> = {
		...ORDER,
		...orderPatch,
		service: { id: 'service_1', title: 'Диплом', images: [] },
		student: { id: 'student_1', name: 'Клиент', avatar: null },
		freelancer: { id: 'freelancer_1', name: 'Исполнитель', avatar: null },
		review: null,
		payment,
		payout: null,
		refundRequests: [],
		deadlineExtensions: [],
		messages: [],
	}

	const order = {
		findUnique: jest.fn().mockImplementation(() => Promise.resolve(current)),
		findMany: jest.fn().mockResolvedValue([current]),
		update: jest.fn().mockImplementation(({ data }) => {
			Object.assign(current, data)
			return Promise.resolve({ ...current })
		}),
		updateMany: jest.fn().mockImplementation(({ where, data }) => {
			if (where.status && current.status !== where.status) {
				return Promise.resolve({ count: 0 })
			}
			if (
				where.confirmDeadline?.lt &&
				current.confirmDeadline &&
				current.confirmDeadline >= where.confirmDeadline.lt
			) {
				return Promise.resolve({ count: 0 })
			}
			Object.assign(current, data)
			return Promise.resolve({ count: 1 })
		}),
		create: jest.fn().mockImplementation(({ data }) =>
			Promise.resolve({
				...current,
				...data,
				id: 'new_order',
			}),
		),
	}
	const deadlineExtensionRequest = {
		create: jest.fn().mockImplementation(({ data }) =>
			Promise.resolve({
				id: 'extension_1',
				status: DeadlineExtensionStatus.PENDING,
				...data,
			}),
		),
		findUnique: jest.fn(),
		updateMany: jest.fn().mockResolvedValue({ count: 1 }),
	}
	const prisma: Record<string, any> = {
		order,
		payment: { findUnique: jest.fn().mockResolvedValue(payment) },
		servicePackage: {
			findUnique: jest.fn().mockResolvedValue({
				id: 'pkg_1',
				name: 'Стандарт',
				description: 'Условия на момент заказа',
				price: 300_000,
				deliveryDays: 10,
				revisions: 2,
				features: ['Расчёты', 'Пояснения'],
				service: {
					id: 'service_1',
					freelancerId: 'freelancer_1',
					isActive: true,
					deletedAt: null,
				},
			}),
		},
		freelancerProfile: {
			updateMany: jest.fn().mockResolvedValue({ count: 1 }),
		},
		service: { update: jest.fn().mockResolvedValue({}) },
		deadlineExtensionRequest,
		refundRequest: {
			create: jest
				.fn()
				.mockImplementation(({ data }) =>
					Promise.resolve({ id: 'refund_1', ...data }),
				),
			findMany: jest.fn(),
			findUnique: jest.fn(),
		},
	}
	prisma.$transaction = jest
		.fn()
		.mockImplementation((callback) => callback(prisma))

	const s3 = { signUrl: jest.fn().mockImplementation((value) => value) }
	const payments = {
		charge: jest.fn().mockResolvedValue('SUCCEEDED'),
		sendPayout: jest.fn().mockResolvedValue('SENT'),
		refund: jest.fn().mockResolvedValue(true),
	}
	const service = new OrdersService(
		prisma as never,
		s3 as never,
		payments as never,
	)
	return { service, prisma, payments, current }
}

describe('OrdersService', () => {
	describe('immutable package snapshot', () => {
		it('копирует все условия пакета в заказ', async () => {
			const { service, prisma } = build()
			await service.create('student_1', { packageId: 'pkg_1' })

			expect(prisma.order.create.mock.calls[0][0].data).toEqual(
				expect.objectContaining({
					totalPrice: 300_000,
					packageName: 'Стандарт',
					packageDescription: 'Условия на момент заказа',
					packageDeliveryDays: 10,
					packageRevisions: 2,
					packageFeatures: ['Расчёты', 'Пояснения'],
				}),
			)
		})

		it('возвращает снимок, даже если связанный пакет изменился', async () => {
			const { service, current } = build({ packageName: 'Старое название' })
			current.package = { name: 'Новое название', price: 999_999 }

			const result = await service.findOne('order_1', 'student_1')
			expect(result.package.name).toBe('Старое название')
			expect(result.package.price).toBe(300_000)
		})
	})

	describe('role boundaries', () => {
		it('после смены роли клиент не может подтвердить свой старый заказ как исполнитель', async () => {
			const { service } = build()
			await expect(
				service.confirm('order_1', 'freelancer_1', UserRole.STUDENT),
			).rejects.toThrow(ForbiddenException)
		})

		it('после смены роли исполнитель не может оплатить старый клиентский заказ', async () => {
			const { service } = build({ status: OrderStatus.AWAITING_PAYMENT })
			await expect(
				service.pay('order_1', 'student_1', UserRole.FREELANCER),
			).rejects.toThrow(ForbiddenException)
		})

		it('прямой ID не позволяет действовать не в текущей роли', async () => {
			const { service } = build({ status: OrderStatus.IN_PROGRESS })
			await expect(
				service.updateStatus('order_1', 'freelancer_1', UserRole.STUDENT, {
					status: OrderStatus.REVIEW,
				}),
			).rejects.toThrow(ForbiddenException)
		})
	})

	describe('payment state machine', () => {
		it('подтверждение резервирует переход без списания', async () => {
			const { service, current, payments } = build()
			await service.confirm('order_1', 'freelancer_1', UserRole.FREELANCER)

			expect(current.status).toBe(OrderStatus.AWAITING_PAYMENT)
			expect(payments.charge).not.toHaveBeenCalled()
		})

		it('успешная оплата назначает дедлайн из снимка пакета', async () => {
			const { service, current } = build({
				status: OrderStatus.AWAITING_PAYMENT,
			})
			const before = Date.now()

			await service.pay('order_1', 'student_1', UserRole.STUDENT)

			expect(current.status).toBe(OrderStatus.IN_PROGRESS)
			expect(current.deadline!.getTime()).toBeGreaterThanOrEqual(
				before + 10 * 24 * 60 * 60 * 1000,
			)
		})

		it('при отказе возвращает заказ в ожидание оплаты', async () => {
			const { service, current, payments } = build({
				status: OrderStatus.AWAITING_PAYMENT,
			})
			payments.charge.mockResolvedValue('FAILED')

			await service.pay('order_1', 'student_1', UserRole.STUDENT)
			expect(current.status).toBe(OrderStatus.AWAITING_PAYMENT)
		})

		it('не открывает отмену, пока платёж обрабатывается', async () => {
			const { service, current, payments } = build({
				status: OrderStatus.AWAITING_PAYMENT,
			})
			payments.charge.mockResolvedValue('PROCESSING')

			await expect(
				service.pay('order_1', 'student_1', UserRole.STUDENT),
			).rejects.toThrow(ServiceUnavailableException)
			expect(current.status).toBe(OrderStatus.PAYMENT_PROCESSING)
		})
	})

	describe('safe completion', () => {
		it('не завершает и не увеличивает счётчики при неуспешной выплате', async () => {
			const { service, prisma, payments, current } = build(
				{ status: OrderStatus.REVIEW },
				{ status: PaymentStatus.SUCCEEDED },
			)
			payments.sendPayout.mockResolvedValue('FAILED')

			await expect(
				service.updateStatus('order_1', 'student_1', UserRole.STUDENT, {
					status: OrderStatus.COMPLETED,
				}),
			).rejects.toThrow(/выплат/iu)

			expect(current.status).toBe(OrderStatus.REVIEW)
			expect(prisma.freelancerProfile.updateMany).not.toHaveBeenCalled()
			expect(prisma.service.update).not.toHaveBeenCalled()
		})

		it('завершает и обновляет счётчики в одной транзакции после SENT', async () => {
			const { service, prisma, current } = build(
				{ status: OrderStatus.REVIEW },
				{ status: PaymentStatus.SUCCEEDED },
			)

			await service.updateStatus('order_1', 'student_1', UserRole.STUDENT, {
				status: OrderStatus.COMPLETED,
			})

			expect(current.status).toBe(OrderStatus.COMPLETED)
			expect(prisma.$transaction).toHaveBeenCalledTimes(1)
			expect(prisma.freelancerProfile.updateMany).toHaveBeenCalledTimes(1)
			expect(prisma.service.update).toHaveBeenCalledTimes(1)
		})

		it('повторное завершение не делает вторую выплату и не меняет счётчики', async () => {
			const { service, prisma, payments } = build(
				{ status: OrderStatus.REVIEW },
				{ status: PaymentStatus.SUCCEEDED },
			)
			await service.updateStatus('order_1', 'student_1', UserRole.STUDENT, {
				status: OrderStatus.COMPLETED,
			})

			await expect(
				service.updateStatus('order_1', 'student_1', UserRole.STUDENT, {
					status: OrderStatus.COMPLETED,
				}),
			).rejects.toThrow(BadRequestException)
			expect(payments.sendPayout).toHaveBeenCalledTimes(1)
			expect(prisma.freelancerProfile.updateMany).toHaveBeenCalledTimes(1)
			expect(prisma.service.update).toHaveBeenCalledTimes(1)
		})
	})

	describe('deadlines and extensions', () => {
		it('исполнитель может запросить продление только после дедлайна', async () => {
			const { service, prisma } = build({
				status: OrderStatus.IN_PROGRESS,
				deadline: new Date(Date.now() - 1000),
			})

			await service.requestDeadlineExtension(
				'order_1',
				'freelancer_1',
				UserRole.FREELANCER,
				{ additionalDays: 3, reason: 'Нужны дополнительные расчёты' },
			)

			expect(prisma.deadlineExtensionRequest.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					activeKey: 'order_1',
					additionalDays: 3,
				}),
			})
		})

		it('до дедлайна продление недоступно', async () => {
			const { service } = build({
				status: OrderStatus.IN_PROGRESS,
				deadline: new Date(Date.now() + 60_000),
			})
			await expect(
				service.requestDeadlineExtension(
					'order_1',
					'freelancer_1',
					UserRole.FREELANCER,
					{ additionalDays: 2, reason: 'Нужны дополнительные расчёты' },
				),
			).rejects.toThrow(BadRequestException)
		})

		it('одобрение добавляет дни от текущего момента для просроченного заказа', async () => {
			const oldDeadline = new Date(Date.now() - 86_400_000)
			const { service, prisma, current } = build({
				status: OrderStatus.IN_PROGRESS,
				deadline: oldDeadline,
			})
			prisma.deadlineExtensionRequest.findUnique.mockResolvedValue({
				id: 'extension_1',
				orderId: 'order_1',
				additionalDays: 2,
				status: DeadlineExtensionStatus.PENDING,
				order: current,
			})
			const before = Date.now()

			await service.resolveDeadlineExtension(
				'order_1',
				'extension_1',
				'student_1',
				UserRole.STUDENT,
				{ approved: true },
			)

			expect(current.deadline!.getTime()).toBeGreaterThanOrEqual(
				before + 2 * 24 * 60 * 60 * 1000,
			)
		})
	})

	describe('refund request groundwork', () => {
		it('сохраняет причину и полный неизменяемый контекст заказа', async () => {
			const payment = {
				status: PaymentStatus.SUCCEEDED,
				amount: 300_000,
				fee: 39_000,
				paidAt: new Date(),
			}
			const { service, prisma } = build(
				{ status: OrderStatus.IN_PROGRESS, deadline: new Date() },
				payment,
			)

			await service.createRefundRequest(
				'order_1',
				'student_1',
				UserRole.STUDENT,
				{
					reason: RefundReason.MISSED_DEADLINE,
					message: 'Исполнитель не прислал работу в срок',
				},
			)

			const data = prisma.refundRequest.create.mock.calls[0][0].data
			expect(data.activeKey).toBe('order_1')
			expect(data.contextSnapshot).toEqual(
				expect.objectContaining({
					orderId: 'order_1',
					package: expect.objectContaining({
						name: 'Стандарт',
						price: 300_000,
						deliveryDays: 10,
					}),
					student: expect.objectContaining({ id: 'student_1' }),
					freelancer: expect.objectContaining({ id: 'freelancer_1' }),
				}),
			)
		})

		it('исполнитель не может создать возврат по прямому ID', async () => {
			const { service } = build(
				{ status: OrderStatus.IN_PROGRESS },
				{ status: PaymentStatus.SUCCEEDED },
			)
			await expect(
				service.createRefundRequest(
					'order_1',
					'freelancer_1',
					UserRole.FREELANCER,
					{
						reason: RefundReason.OTHER,
						message: 'Пытаюсь запросить чужой возврат',
					},
				),
			).rejects.toThrow(ForbiddenException)
		})
	})
})
