import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { OrdersService } from './orders.service'

/**
 * Тесты стейт-машины заказа на моках. Главное, что здесь защищается:
 * из PENDING нельзя попасть в работу минуя подтверждение — иначе исполнитель
 * начинал бы работу в обход оплаты.
 */

interface TestOrder {
	id: string
	studentId: string
	freelancerId: string
	serviceId: string
	totalPrice: number
	status: OrderStatus
	confirmDeadline: Date | null
	confirmedAt: Date | null
}

const ORDER: TestOrder = {
	id: 'order_1',
	studentId: 'student_1',
	freelancerId: 'freelancer_1',
	serviceId: 'service_1',
	totalPrice: 300_000,
	status: OrderStatus.PENDING,
	confirmDeadline: new Date(Date.now() + 3_600_000),
	confirmedAt: null,
}

function build(order: Partial<TestOrder> = {}, payment: unknown = null) {
	const current = { ...ORDER, ...order }
	const prisma = {
		order: {
			findUnique: jest.fn().mockResolvedValue(current),
			update: jest.fn().mockImplementation(({ data }) => ({
				...current,
				...data,
			})),
			updateMany: jest.fn().mockResolvedValue({ count: 0 }),
			create: jest.fn().mockImplementation(({ data }) => ({
				id: 'new_order',
				...data,
			})),
		},
		payment: { findUnique: jest.fn().mockResolvedValue(payment) },
		servicePackage: {
			findUnique: jest.fn().mockResolvedValue({
				id: 'pkg_1',
				price: 300_000,
				service: { id: 'service_1', freelancerId: 'freelancer_1', isActive: true },
			}),
		},
	}
	const s3 = { signUrl: jest.fn().mockImplementation((v: string) => v) }
	const payments = { chargeAndPayout: jest.fn().mockResolvedValue(true) }
	const service = new OrdersService(
		prisma as never,
		s3 as never,
		payments as never,
	)
	return { service, prisma, payments }
}

describe('OrdersService', () => {
	describe('create', () => {
		it('ставит дедлайн подтверждения на 24 часа вперёд', async () => {
			const { service, prisma } = build()
			await service.create('student_1', { packageId: 'pkg_1' })

			const data = prisma.order.create.mock.calls[0][0].data
			const hours =
				(data.confirmDeadline.getTime() - Date.now()) / 3_600_000
			expect(hours).toBeGreaterThan(23.9)
			expect(hours).toBeLessThan(24.1)
		})
	})

	describe('confirm', () => {
		it('переводит в ACCEPTED и запускает оплату', async () => {
			const { service, prisma, payments } = build()
			await service.confirm('order_1', 'freelancer_1')

			expect(prisma.order.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: OrderStatus.ACCEPTED }),
				}),
			)
			expect(payments.chargeAndPayout).toHaveBeenCalled()
		})

		it('отменяет заказ, если оплата не прошла', async () => {
			const { service, prisma, payments } = build()
			payments.chargeAndPayout.mockResolvedValue(false)

			await service.confirm('order_1', 'freelancer_1')

			expect(prisma.order.update).toHaveBeenLastCalledWith(
				expect.objectContaining({
					data: { status: OrderStatus.CANCELLED },
				}),
			)
		})

		it('подтвердить может только исполнитель', async () => {
			const { service } = build()
			await expect(service.confirm('order_1', 'student_1')).rejects.toThrow(
				ForbiddenException,
			)
		})

		it('повторное подтверждение отклоняется', async () => {
			const { service } = build({ status: OrderStatus.ACCEPTED })
			await expect(service.confirm('order_1', 'freelancer_1')).rejects.toThrow(
				BadRequestException,
			)
		})

		it('отменённый по таймауту заказ подтвердить нельзя', async () => {
			const { service } = build({ status: OrderStatus.CANCELLED })
			await expect(
				service.confirm('order_1', 'freelancer_1'),
			).rejects.toThrow(/срок подтверждения истёк/)
		})
	})

	describe('updateStatus', () => {
		it('PENDING → IN_PROGRESS запрещён: только через подтверждение', async () => {
			const { service } = build({ status: OrderStatus.PENDING })
			await expect(
				service.updateStatus('order_1', 'freelancer_1', {
					status: OrderStatus.IN_PROGRESS,
				}),
			).rejects.toThrow(BadRequestException)
		})

		it('PENDING → CANCELLED разрешён', async () => {
			const { service, prisma } = build({ status: OrderStatus.PENDING })
			await service.updateStatus('order_1', 'freelancer_1', {
				status: OrderStatus.CANCELLED,
			})
			expect(prisma.order.update).toHaveBeenCalled()
		})

		it('оплаченный ACCEPTED уходит в работу', async () => {
			const { service, prisma } = build({ status: OrderStatus.ACCEPTED }, {
				status: PaymentStatus.SUCCEEDED,
			})
			await service.updateStatus('order_1', 'freelancer_1', {
				status: OrderStatus.IN_PROGRESS,
			})
			expect(prisma.order.update).toHaveBeenCalled()
		})

		it('неоплаченный ACCEPTED в работу не уходит', async () => {
			const { service } = build({ status: OrderStatus.ACCEPTED }, {
				status: PaymentStatus.FAILED,
			})
			await expect(
				service.updateStatus('order_1', 'freelancer_1', {
					status: OrderStatus.IN_PROGRESS,
				}),
			).rejects.toThrow(/оплата не прошла/)
		})

		it('завершённый заказ уже не меняется', async () => {
			const { service } = build({ status: OrderStatus.COMPLETED })
			await expect(
				service.updateStatus('order_1', 'freelancer_1', {
					status: OrderStatus.IN_PROGRESS,
				}),
			).rejects.toThrow(BadRequestException)
		})
	})
})
