/// <reference types="jest" />
import { PaymentStatus, PayoutStatus } from '@prisma/client'
import { PaymentProvider } from './payment-provider.interface'
import { PaymentsService } from './payments.service'

/**
 * Тесты на моках: базу и провайдера не трогаем, проверяем арифметику
 * комиссии и порядок операций — выплата не должна уходить, если списание
 * не прошло.
 */

type MockFn = jest.Mock<any, any>

type PrismaMock = {
	payment: { upsert: MockFn; update: MockFn; findUnique: MockFn }
	payout: { upsert: MockFn; update: MockFn; findUnique: MockFn }
}

function makePrisma(): PrismaMock {
	return {
		payment: {
			upsert: jest.fn().mockResolvedValue({ id: 'pay_1' }),
			update: jest.fn().mockResolvedValue({}),
			findUnique: jest.fn().mockResolvedValue({
				id: 'pay_1',
				amount: 300_000,
				fee: 30_000,
				status: PaymentStatus.SUCCEEDED,
			}),
		},
		payout: {
			upsert: jest.fn().mockResolvedValue({ id: 'out_1' }),
			update: jest.fn().mockResolvedValue({}),
			findUnique: jest.fn().mockResolvedValue(null),
		},
	}
}

function makeConfig(feePercent: unknown) {
	return { get: jest.fn().mockReturnValue(feePercent) }
}

function makeProvider(overrides: Partial<PaymentProvider> = {}) {
	return {
		charge: jest.fn().mockResolvedValue({ success: true, providerRef: 'ch_1' }),
		payout: jest.fn().mockResolvedValue({ success: true, providerRef: 'po_1' }),
		refund: jest.fn().mockResolvedValue({ success: true, providerRef: 'rf_1' }),
		isLive: jest.fn().mockReturnValue(false),
		...overrides,
	}
}

const order = {
	id: 'order_1',
	studentId: 'student_1',
	freelancerId: 'freelancer_1',
	totalPrice: 300_000, // 3000 ₽ в копейках
} as never

function build(
	feePercent: unknown = 10,
	provider = makeProvider(),
): [PaymentsService, PrismaMock, ReturnType<typeof makeProvider>] {
	const prisma = makePrisma()
	const service = new PaymentsService(
		prisma as never,
		makeConfig(feePercent) as never,
		provider as never,
	)
	return [service, prisma, provider]
}

describe('PaymentsService', () => {
	describe('комиссия', () => {
		it('считает процент от суммы', () => {
			const [service] = build(10)
			expect(service.calculateFee(300_000)).toBe(30_000)
		})

		it('нулевая ставка — комиссии нет', () => {
			const [service] = build(0)
			expect(service.calculateFee(300_000)).toBe(0)
		})

		it('округляет до копейки, а не теряет остаток', () => {
			const [service] = build(10)
			// 3333 копейки * 10% = 333.3 → 333
			expect(service.calculateFee(3_333)).toBe(333)
		})

		it('откатывается на 10% при мусоре в конфиге', () => {
			expect(build('абв')[0].feePercent).toBe(10)
			expect(build(-5)[0].feePercent).toBe(10)
			expect(build(150)[0].feePercent).toBe(10)
		})
	})

	describe('charge (депонирование в эскроу)', () => {
		it('успешное списание помечает платёж SUCCEEDED и НЕ отправляет выплату', async () => {
			const [service, prisma, provider] = build()
			const paid = await service.charge(order)

			expect(paid).toBe(true)
			expect(prisma.payment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
				}),
			)
			// Деньги в эскроу — выплата исполнителю ещё НЕ уходит
			expect(provider.payout).not.toHaveBeenCalled()
			expect(prisma.payout.upsert).not.toHaveBeenCalled()
		})

		it('при отказе провайдера платёж помечается FAILED', async () => {
			const provider = makeProvider({
				charge: jest
					.fn()
					.mockResolvedValue({ success: false, failureReason: 'Нет средств' }),
			} as never)
			const [service, prisma] = build(10, provider)

			const paid = await service.charge(order)

			expect(paid).toBe(false)
			expect(prisma.payment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: PaymentStatus.FAILED,
						failureReason: 'Нет средств',
					}),
				}),
			)
			expect(provider.payout).not.toHaveBeenCalled()
		})
	})

	describe('sendPayout (выплата из эскроу при COMPLETED)', () => {
		it('выплачивает исполнителю сумму за вычетом комиссии платформы', async () => {
			const [service, prisma, provider] = build(10)
			const success = await service.sendPayout(order)

			expect(success).toBe(true)
			expect(prisma.payout.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					create: expect.objectContaining({ amount: 270_000 }),
				}),
			)
			expect(prisma.payout.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: PayoutStatus.SENT }),
				}),
			)
			expect(provider.payout).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 270_000 }),
			)
		})

		it('не отправляет выплату, если заказчик не оплатил заказ', async () => {
			const [service, prisma, provider] = build(10)
			prisma.payment.findUnique.mockResolvedValue({
				status: PaymentStatus.FAILED,
			})

			const success = await service.sendPayout(order)

			expect(success).toBe(false)
			expect(provider.payout).not.toHaveBeenCalled()
		})

		it('идемпотентно: не отправляет выплату повторно, если статус уже SENT', async () => {
			const [service, prisma, provider] = build(10)
			prisma.payout.findUnique.mockResolvedValue({
				status: PayoutStatus.SENT,
			})

			const success = await service.sendPayout(order)

			expect(success).toBe(true)
			expect(provider.payout).not.toHaveBeenCalled()
		})
	})

	describe('refund (возврат средств из эскроу при CANCELLED)', () => {
		it('успешно возвращает средства заказчику', async () => {
			const [service, prisma, provider] = build(10)
			const refunded = await service.refund(order)

			expect(refunded).toBe(true)
			expect(provider.refund).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 300_000 }),
			)
			expect(prisma.payment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: PaymentStatus.REFUNDED }),
				}),
			)
		})

		it('не возвращает средства, если выплата уже отправлена исполнителю', async () => {
			const [service, prisma, provider] = build(10)
			prisma.payout.findUnique.mockResolvedValue({
				status: PayoutStatus.SENT,
			})

			const refunded = await service.refund(order)

			expect(refunded).toBe(false)
			expect(provider.refund).not.toHaveBeenCalled()
		})
	})

	describe('chargeAndPayout (обратная совместимость)', () => {
		it('выполняет списание и сразу выплату', async () => {
			const [service, prisma, provider] = build(10)
			const success = await service.chargeAndPayout(order)

			expect(success).toBe(true)
			expect(provider.charge).toHaveBeenCalled()
			expect(provider.payout).toHaveBeenCalled()
		})
	})
})
