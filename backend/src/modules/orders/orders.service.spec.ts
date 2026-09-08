/// <reference types="jest" />
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { OrdersService } from './orders.service'

/**
 * Тесты стейт-машины заказа на моках. Ключевое, что защищается:
 * — подтверждение исполнителем (confirm) НЕ списывает деньги;
 * — списание только на оплате заказчиком (pay);
 * — отменить можно лишь до оплаты, и только заказчиком (исполнитель — отклонить
 *   ещё не подтверждённый заказ); оплаченный заказ не отменяется вовсе.
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
		freelancerProfile: {
			updateMany: jest.fn().mockResolvedValue({ count: 1 }),
		},
		service: {
			update: jest.fn().mockResolvedValue({}),
		},
	}
	const s3 = { signUrl: jest.fn().mockImplementation((v: string) => v) }
	const payments = {
		charge: jest.fn().mockResolvedValue(true),
		sendPayout: jest.fn().mockResolvedValue(true),
		refund: jest.fn().mockResolvedValue(true),
	}
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
			const hours = (data.confirmDeadline.getTime() - Date.now()) / 3_600_000
			expect(hours).toBeGreaterThan(23.9)
			expect(hours).toBeLessThan(24.1)
		})
	})

	describe('confirm (подтверждение исполнителем)', () => {
		it('переводит в AWAITING_PAYMENT и НЕ списывает деньги', async () => {
			const { service, prisma, payments } = build()
			await service.confirm('order_1', 'freelancer_1')

			expect(prisma.order.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: OrderStatus.AWAITING_PAYMENT,
					}),
				}),
			)
			expect(payments.charge).not.toHaveBeenCalled()
		})

		it('подтвердить может только исполнитель', async () => {
			const { service } = build()
			await expect(service.confirm('order_1', 'student_1')).rejects.toThrow(
				ForbiddenException,
			)
		})

		it('повторное подтверждение отклоняется', async () => {
			const { service } = build({ status: OrderStatus.AWAITING_PAYMENT })
			await expect(
				service.confirm('order_1', 'freelancer_1'),
			).rejects.toThrow(BadRequestException)
		})

		it('отменённый по таймауту заказ подтвердить нельзя', async () => {
			const { service } = build({ status: OrderStatus.CANCELLED })
			await expect(
				service.confirm('order_1', 'freelancer_1'),
			).rejects.toThrow(/срок подтверждения истёк/)
		})
	})

	describe('pay (оплата заказчиком)', () => {
		it('списывает и переводит в IN_PROGRESS', async () => {
			const { service, prisma, payments } = build({
				status: OrderStatus.AWAITING_PAYMENT,
			})
			await service.pay('order_1', 'student_1')

			expect(payments.charge).toHaveBeenCalled()
			expect(prisma.order.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { status: OrderStatus.IN_PROGRESS },
				}),
			)
		})

		it('оплатить может только заказчик', async () => {
			const { service } = build({ status: OrderStatus.AWAITING_PAYMENT })
			await expect(service.pay('order_1', 'freelancer_1')).rejects.toThrow(
				ForbiddenException,
			)
		})

		it('нельзя оплатить неподтверждённый заказ', async () => {
			const { service } = build({ status: OrderStatus.PENDING })
			await expect(service.pay('order_1', 'student_1')).rejects.toThrow(
				/не подтверждён/,
			)
		})

		it('при отказе в оплате заказ остаётся в ожидании (не IN_PROGRESS)', async () => {
			const { service, prisma, payments } = build({
				status: OrderStatus.AWAITING_PAYMENT,
			})
			payments.charge.mockResolvedValue(false)
			await service.pay('order_1', 'student_1')

			const statusUpdates = prisma.order.update.mock.calls.filter(
				(c: [{ data?: { status?: OrderStatus } }]) =>
					c[0]?.data?.status === OrderStatus.IN_PROGRESS,
			)
			expect(statusUpdates).toHaveLength(0)
		})
	})

	describe('updateStatus — рабочие переходы', () => {
		it('PENDING → IN_PROGRESS запрещён (только через confirm+pay)', async () => {
			const { service } = build({ status: OrderStatus.PENDING })
			await expect(
				service.updateStatus('order_1', 'freelancer_1', {
					status: OrderStatus.IN_PROGRESS,
				}),
			).rejects.toThrow(BadRequestException)
		})

		it('фрилансер отправляет работу на проверку (IN_PROGRESS → REVIEW)', async () => {
			const { service, prisma } = build({ status: OrderStatus.IN_PROGRESS })
			await service.updateStatus('order_1', 'freelancer_1', {
				status: OrderStatus.REVIEW,
			})
			expect(prisma.order.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: OrderStatus.REVIEW }),
				}),
			)
		})

		it('фрилансер НЕ может закрыть заказ в обход проверки (IN_PROGRESS → COMPLETED)', async () => {
			const { service } = build({ status: OrderStatus.IN_PROGRESS })
			await expect(
				service.updateStatus('order_1', 'freelancer_1', {
					status: OrderStatus.COMPLETED,
				}),
			).rejects.toThrow(ForbiddenException)
		})

		it('заказчик принимает работу (REVIEW → COMPLETED) → выплата из эскроу', async () => {
			const { service, prisma, payments } = build(
				{ status: OrderStatus.REVIEW },
				{ status: PaymentStatus.SUCCEEDED },
			)
			await service.updateStatus('order_1', 'student_1', {
				status: OrderStatus.COMPLETED,
			})
			expect(prisma.order.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: OrderStatus.COMPLETED }),
				}),
			)
			expect(payments.sendPayout).toHaveBeenCalled()
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

	describe('updateStatus — отмена', () => {
		it('заказчик отменяет до оплаты (AWAITING_PAYMENT)', async () => {
			const { service, prisma } = build({
				status: OrderStatus.AWAITING_PAYMENT,
			})
			await service.updateStatus('order_1', 'student_1', {
				status: OrderStatus.CANCELLED,
			})
			expect(prisma.order.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { status: OrderStatus.CANCELLED },
				}),
			)
		})

		it('исполнитель отклоняет ещё не подтверждённый заказ (PENDING)', async () => {
			const { service, prisma } = build({ status: OrderStatus.PENDING })
			await service.updateStatus('order_1', 'freelancer_1', {
				status: OrderStatus.CANCELLED,
			})
			expect(prisma.order.update).toHaveBeenCalled()
		})

		it('исполнитель НЕ может отменить подтверждённый заказ (AWAITING_PAYMENT)', async () => {
			const { service } = build({ status: OrderStatus.AWAITING_PAYMENT })
			await expect(
				service.updateStatus('order_1', 'freelancer_1', {
					status: OrderStatus.CANCELLED,
				}),
			).rejects.toThrow(ForbiddenException)
		})

		it('оплаченный заказ (IN_PROGRESS) отменить нельзя', async () => {
			const { service } = build(
				{ status: OrderStatus.IN_PROGRESS },
				{ status: PaymentStatus.SUCCEEDED },
			)
			await expect(
				service.updateStatus('order_1', 'student_1', {
					status: OrderStatus.CANCELLED,
				}),
			).rejects.toThrow(/отменить нельзя/)
		})
	})
})
