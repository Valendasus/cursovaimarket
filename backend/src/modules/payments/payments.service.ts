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

	/**
	 * Ставка комиссии платформы в процентах. Меняется без деплоя, через env.
	 * По умолчанию 13% — это заложенные ~10% маржи платформы + ~3% комиссии
	 * платёжного провайдера (ЮKassa удерживает свой процент на своей стороне).
	 */
	get feePercent(): number {
		const raw = Number(this.config.get('PLATFORM_FEE_PERCENT', 13))
		if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
			this.logger.warn(
				`PLATFORM_FEE_PERCENT=${this.config.get('PLATFORM_FEE_PERCENT')} некорректен, использую 13%`,
			)
			return 13
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
	 * Списывает деньги с заказчика и депонирует их на счёте эскроу платформы.
	 * Выплата исполнителю на этом этапе НЕ производится.
	 *
	 * Возвращает true, если деньги с заказчика успешно списаны.
	 */
	async charge(order: Order): Promise<boolean> {
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

		return true
	}

	/**
	 * Выплата исполнителю из средств эскроу при завершении заказа (COMPLETED).
	 * Переводит исполнителю сумму за вычетом комиссии платформы.
	 *
	 * Выплата уходит ТОЛЬКО если платёж заказчика в статусе SUCCEEDED
	 * и выплата ещё не была отправлена ранее (идемпотентность).
	 */
	async sendPayout(order: Order): Promise<boolean> {
		const payment = await this.prisma.payment.findUnique({
			where: { orderId: order.id },
		})

		if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
			this.logger.error(
				`Нельзя выплатить по заказу ${order.id}: платёж заказчика не подтверждён`,
			)
			return false
		}

		const existingPayout = await this.prisma.payout.findUnique({
			where: { orderId: order.id },
		})
		if (existingPayout && existingPayout.status === PayoutStatus.SENT) {
			return true
		}

		const payoutAmount = payment.amount - payment.fee

		const payout = await this.prisma.payout.upsert({
			where: { orderId: order.id },
			create: {
				orderId: order.id,
				amount: payoutAmount,
				status: PayoutStatus.PENDING,
			},
			update: { amount: payoutAmount, status: PayoutStatus.PENDING },
		})

		const result = await this.provider.payout({
			orderId: order.id,
			amount: payoutAmount,
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
				`Выплата по заказу ${order.id} не прошла: ${result.failureReason}. Деньги заказчика в эскроу — требуется ручной разбор.`,
			)
			return false
		}

		return true
	}

	/**
	 * Возврат средств заказчику при отмене заказа (CANCELLED).
	 * Возврат возможен только если платёж был проведён (SUCCEEDED)
	 * и выплата исполнителю ещё не отправлена.
	 */
	async refund(order: Order): Promise<boolean> {
		const payment = await this.prisma.payment.findUnique({
			where: { orderId: order.id },
		})

		if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
			return false
		}

		const payout = await this.prisma.payout.findUnique({
			where: { orderId: order.id },
		})

		if (payout && payout.status === PayoutStatus.SENT) {
			this.logger.error(
				`Нельзя вернуть средства по заказу ${order.id}: выплата исполнителю уже отправлена`,
			)
			return false
		}

		const result = await this.provider.refund({
			orderId: order.id,
			amount: payment.amount,
			payerId: order.studentId,
			description: `Возврат средств по заказу ${order.id}`,
		})

		if (result.success) {
			await this.prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: PaymentStatus.REFUNDED,
					failureReason: null,
				},
			})
			return true
		} else {
			this.logger.error(
				`Возврат средств по заказу ${order.id} не прошёл: ${result.failureReason}`,
			)
			return false
		}
	}

	/**
	 * Совмещённое списание и выплата (для обратной совместимости).
	 */
	async chargeAndPayout(order: Order): Promise<boolean> {
		const charged = await this.charge(order)
		if (!charged) return false
		return this.sendPayout(order)
	}
}
