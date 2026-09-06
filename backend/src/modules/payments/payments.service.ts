import { PrismaService } from '@/prisma/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Order, PaymentStatus, PayoutStatus } from '@prisma/client'
import { PaymentProvider } from './payment-provider.interface'

@Injectable()
export class PaymentsService {
	private readonly logger = new Logger(PaymentsService.name)

	constructor(
		private prisma: PrismaService,
		private config: ConfigService,
		private provider: PaymentProvider,
	) {}

	/** Ставка комиссии платформы в процентах. Меняется без деплоя, через env. */
	get feePercent(): number {
		const raw = Number(this.config.get('PLATFORM_FEE_PERCENT', 10))
		if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
			this.logger.warn(
				`PLATFORM_FEE_PERCENT=${this.config.get('PLATFORM_FEE_PERCENT')} некорректен, использую 10%`,
			)
			return 10
		}
		return raw
	}

	/** Комиссия с суммы заказа, в копейках */
	calculateFee(amount: number): number {
		return Math.round((amount * this.feePercent) / 100)
	}

	isProviderLive(): boolean {
		return this.provider.isLive()
	}

	/**
	 * Списывает деньги с заказчика и, если списание прошло, сразу выплачивает
	 * исполнителю сумму за вычетом комиссии.
	 *
	 * Порядок принципиален: выплата уходит ТОЛЬКО после успешного списания.
	 * Иначе платформа выплатит деньги, которых не получила.
	 *
	 * Возвращает true, если деньги с заказчика списаны.
	 */
	async chargeAndPayout(order: Order): Promise<boolean> {
		const amount = order.totalPrice
		const fee = this.calculateFee(amount)

		// upsert, а не create: повторное подтверждение не должно ронять запрос
		// дублем по уникальному orderId
		const payment = await this.prisma.payment.upsert({
			where: { orderId: order.id },
			create: {
				orderId: order.id,
				amount,
				fee,
				status: PaymentStatus.PENDING,
			},
			update: { amount, fee, status: PaymentStatus.PENDING },
		})

		const charge = await this.provider.charge({
			orderId: order.id,
			amount,
			payerId: order.studentId,
			description: `Оплата заказа ${order.id}`,
		})

		if (!charge.success) {
			await this.prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: PaymentStatus.FAILED,
					failureReason: charge.failureReason ?? 'Провайдер отклонил списание',
					providerRef: charge.providerRef,
				},
			})
			this.logger.warn(
				`Списание по заказу ${order.id} не прошло: ${charge.failureReason}`,
			)
			return false
		}

		await this.prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.SUCCEEDED,
				providerRef: charge.providerRef,
				paidAt: new Date(),
				failureReason: null,
			},
		})

		await this.sendPayout(order, amount - fee)
		return true
	}

	/**
	 * Выплата исполнителю. Её провал НЕ отменяет заказ: деньги с заказчика уже
	 * списаны, исполнитель уже подтвердил. Это операционная проблема —
	 * висит FAILED-строкой в payouts и разбирается вручную.
	 */
	private async sendPayout(order: Order, amount: number): Promise<void> {
		const payout = await this.prisma.payout.upsert({
			where: { orderId: order.id },
			create: { orderId: order.id, amount, status: PayoutStatus.PENDING },
			update: { amount, status: PayoutStatus.PENDING },
		})

		const result = await this.provider.payout({
			orderId: order.id,
			amount,
			payeeId: order.freelancerId,
			description: `Выплата по заказу ${order.id}`,
		})

		await this.prisma.payout.update({
			where: { id: payout.id },
			data: result.success
				? {
						status: PayoutStatus.SENT,
						providerRef: result.providerRef,
						sentAt: new Date(),
						failureReason: null,
					}
				: {
						status: PayoutStatus.FAILED,
						failureReason:
							result.failureReason ?? 'Провайдер отклонил выплату',
					},
		})

		if (!result.success) {
			this.logger.error(
				`Выплата по заказу ${order.id} не прошла: ${result.failureReason}. Деньги с заказчика списаны — требуется ручной разбор.`,
			)
		}
	}
}
