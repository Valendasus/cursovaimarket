import { PaymentStatus, PayoutStatus } from '@prisma/client'
import { PaymentProvider } from './payment-provider.interface'
import { PaymentsService } from './payments.service'

/**
 * Тесты на моках: базу и провайдера не трогаем, проверяем арифметику
 * комиссии и порядок операций — выплата не должна уходить, если списание
 * не прошло.
 */

type PrismaMock = {
	payment: { upsert: jest.Mock; update: jest.Mock }
	payout: { upsert: jest.Mock; update: jest.Mock }
}

function makePrisma(): PrismaMock {
	return {
		payment: {
			upsert: jest.fn().mockResolvedValue({ id: 'pay_1' }),
			update: jest.fn().mockResolvedValue({}),
		},
		payout: {
			upsert: jest.fn().mockResolvedValue({ id: 'out_1' }),
			update: jest.fn().mockResolvedValue({}),
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

	describe('chargeAndPayout', () => {
		it('успешное списание помечает платёж SUCCEEDED', async () => {
			const [service, prisma] = build()
			const paid = await service.chargeAndPayout(order)

			expect(paid).toBe(true)
			expect(prisma.payment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
				}),
			)
		})

		it('исполнителю уходит сумма за вычетом комиссии', async () => {
			const [service, prisma] = build(10)
			await service.chargeAndPayout(order)

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
		})

		it('при отказе в списании выплата НЕ уходит', async () => {
			const provider = makeProvider({
				charge: jest
					.fn()
					.mockResolvedValue({ success: false, failureReason: 'Нет средств' }),
			} as never)
			const [service, prisma] = build(10, provider)

			const paid = await service.chargeAndPayout(order)

			expect(paid).toBe(false)
			expect(provider.payout).not.toHaveBeenCalled()
			expect(prisma.payout.upsert).not.toHaveBeenCalled()
			expect(prisma.payment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: PaymentStatus.FAILED,
						failureReason: 'Нет средств',
					}),
				}),
			)
		})

		it('провал выплаты не отменяет успешное списание', async () => {
			const provider = makeProvider({
				payout: jest
					.fn()
					.mockResolvedValue({ success: false, failureReason: 'Счёт закрыт' }),
			} as never)
			const [service, prisma] = build(10, provider)

			const paid = await service.chargeAndPayout(order)

			// деньги с заказчика списаны — заказ состоялся
			expect(paid).toBe(true)
			expect(prisma.payout.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: PayoutStatus.FAILED,
						failureReason: 'Счёт закрыт',
					}),
				}),
			)
		})
	})
})
