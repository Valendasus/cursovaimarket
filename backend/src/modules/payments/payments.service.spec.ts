/// <reference types="jest" />
import { PaymentStatus, PayoutStatus } from '@prisma/client'
import { PaymentProvider } from './payment-provider.interface'
import { PaymentsService } from './payments.service'

type MockFn = jest.Mock<any, any>
type PrismaMock = {
	payment: {
		create: MockFn
		update: MockFn
		updateMany: MockFn
		findUnique: MockFn
	}
	payout: {
		create: MockFn
		update: MockFn
		updateMany: MockFn
		findUnique: MockFn
	}
}

const freshDate = () => new Date()

function makePrisma(): PrismaMock {
	return {
		payment: {
			create: jest.fn().mockResolvedValue({
				id: 'pay_1',
				status: PaymentStatus.PENDING,
				updatedAt: freshDate(),
			}),
			update: jest.fn().mockResolvedValue({}),
			updateMany: jest.fn().mockResolvedValue({ count: 1 }),
			findUnique: jest.fn().mockResolvedValue(null),
		},
		payout: {
			create: jest.fn().mockResolvedValue({
				id: 'out_1',
				status: PayoutStatus.PENDING,
				updatedAt: freshDate(),
			}),
			update: jest.fn().mockResolvedValue({}),
			updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
	totalPrice: 300_000,
} as never

function build(
	feePercent: unknown = 10,
	provider = makeProvider(),
): [PaymentsService, PrismaMock, ReturnType<typeof makeProvider>] {
	const prisma = makePrisma()
	return [
		new PaymentsService(
			prisma as never,
			makeConfig(feePercent) as never,
			provider as never,
		),
		prisma,
		provider,
	]
}

const succeededPayment = {
	id: 'pay_1',
	amount: 300_000,
	fee: 30_000,
	status: PaymentStatus.SUCCEEDED,
	updatedAt: freshDate(),
}

describe('PaymentsService', () => {
	describe('комиссия', () => {
		it('считает процент от суммы', () => {
			expect(build(10)[0].calculateFee(300_000)).toBe(30_000)
		})

		it('валидирует ставку', () => {
			expect(build(0)[0].calculateFee(300_000)).toBe(0)
			expect(build('абв')[0].feePercent).toBe(13)
			expect(build(-5)[0].feePercent).toBe(13)
			expect(build(150)[0].feePercent).toBe(13)
		})
	})

	describe('charge', () => {
		it('создаёт резерв, списывает один раз и использует стабильный ключ', async () => {
			const [service, prisma, provider] = build()

			await expect(service.charge(order)).resolves.toBe('SUCCEEDED')

			expect(prisma.payment.create).toHaveBeenCalledTimes(1)
			expect(provider.charge).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 300_000,
					idempotencyKey: 'order:order_1:charge',
				}),
			)
			expect(prisma.payment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
				}),
			)
			expect(provider.payout).not.toHaveBeenCalled()
		})

		it('не вызывает провайдера повторно для успешного платежа', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue(succeededPayment)

			await expect(service.charge(order)).resolves.toBe('SUCCEEDED')
			expect(provider.charge).not.toHaveBeenCalled()
		})

		it('не дублирует свежую параллельную операцию', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue({
				id: 'pay_1',
				status: PaymentStatus.PENDING,
				updatedAt: freshDate(),
			})

			await expect(service.charge(order)).resolves.toBe('PROCESSING')
			expect(provider.charge).not.toHaveBeenCalled()
		})

		it('не вызывает провайдера, если параллельный запрос уже создал платёж', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.create.mockRejectedValue({ code: 'P2002' })

			await expect(service.charge(order)).resolves.toBe('PROCESSING')
			expect(provider.charge).not.toHaveBeenCalled()
		})

		it('после отказа разрешает безопасный повтор', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue({
				id: 'pay_1',
				status: PaymentStatus.FAILED,
				updatedAt: freshDate(),
			})

			await expect(service.charge(order)).resolves.toBe('SUCCEEDED')
			expect(prisma.payment.updateMany).toHaveBeenCalledTimes(1)
			expect(provider.charge).toHaveBeenCalledTimes(1)
		})

		it('возвращает FAILED при отказе провайдера', async () => {
			const provider = makeProvider({
				charge: jest
					.fn()
					.mockResolvedValue({ success: false, failureReason: 'Нет средств' }),
			} as never)
			const [service, prisma] = build(10, provider)

			await expect(service.charge(order)).resolves.toBe('FAILED')
			expect(prisma.payment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: PaymentStatus.FAILED,
						failureReason: 'Нет средств',
					}),
				}),
			)
		})
	})

	describe('sendPayout', () => {
		it('выплачивает сумму за вычетом комиссии со стабильным ключом', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue(succeededPayment)

			await expect(service.sendPayout(order)).resolves.toBe('SENT')

			expect(prisma.payout.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ amount: 270_000 }),
				}),
			)
			expect(provider.payout).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 270_000,
					idempotencyKey: 'order:order_1:payout',
				}),
			)
		})

		it('не платит без успешной оплаты', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue({
				status: PaymentStatus.FAILED,
			})

			await expect(service.sendPayout(order)).resolves.toBe('FAILED')
			expect(provider.payout).not.toHaveBeenCalled()
		})

		it('не отправляет повторно уже проведённую выплату', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue(succeededPayment)
			prisma.payout.findUnique.mockResolvedValue({
				status: PayoutStatus.SENT,
			})

			await expect(service.sendPayout(order)).resolves.toBe('SENT')
			expect(provider.payout).not.toHaveBeenCalled()
		})

		it('не дублирует свежую параллельную выплату', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue(succeededPayment)
			prisma.payout.findUnique.mockResolvedValue({
				id: 'out_1',
				status: PayoutStatus.PENDING,
				updatedAt: freshDate(),
			})

			await expect(service.sendPayout(order)).resolves.toBe('PROCESSING')
			expect(provider.payout).not.toHaveBeenCalled()
		})
	})

	describe('refund', () => {
		it('возвращает деньги со стабильным ключом', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue(succeededPayment)

			await expect(service.refund(order)).resolves.toBe(true)
			expect(provider.refund).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 300_000,
					idempotencyKey: 'order:order_1:refund',
				}),
			)
		})

		it('не возвращает после выплаты исполнителю', async () => {
			const [service, prisma, provider] = build()
			prisma.payment.findUnique.mockResolvedValue(succeededPayment)
			prisma.payout.findUnique.mockResolvedValue({ status: PayoutStatus.SENT })

			await expect(service.refund(order)).resolves.toBe(false)
			expect(provider.refund).not.toHaveBeenCalled()
		})
	})
})
