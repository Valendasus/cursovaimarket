import { Injectable, Logger } from '@nestjs/common'
import {
	ChargeRequest,
	PaymentProvider,
	PayoutRequest,
	ProviderResult,
	RefundRequest,
} from './payment-provider.interface'

/**
 * Заглушка: настоящие деньги не двигаются, все операции успешны.
 * Нужна, чтобы весь флоу заказа (подтверждение → списание → выплата) можно
 * было пройти и протестировать до подключения реального провайдера.
 *
 * isLive() === false, поэтому фронт показывает плашку «тестовый режим»
 * вместо формы карты — фейковую форму мы намеренно не рисуем.
 */
@Injectable()
export class MockPaymentProvider extends PaymentProvider {
	private readonly logger = new Logger(MockPaymentProvider.name)
	private readonly completed = new Map<string, ProviderResult>()

	async charge(request: ChargeRequest): Promise<ProviderResult> {
		const previous = this.completed.get(request.idempotencyKey)
		if (previous) return previous
		const ref = this.makeRef('charge')
		this.logger.log(
			`[MOCK] Списание ${this.formatAmount(request.amount)} по заказу ${request.orderId} → ${ref}`,
		)
		const result = { success: true, providerRef: ref }
		this.completed.set(request.idempotencyKey, result)
		return result
	}

	async payout(request: PayoutRequest): Promise<ProviderResult> {
		const previous = this.completed.get(request.idempotencyKey)
		if (previous) return previous
		const ref = this.makeRef('payout')
		this.logger.log(
			`[MOCK] Выплата ${this.formatAmount(request.amount)} исполнителю ${request.payeeId} по заказу ${request.orderId} → ${ref}`,
		)
		const result = { success: true, providerRef: ref }
		this.completed.set(request.idempotencyKey, result)
		return result
	}

	async refund(request: RefundRequest): Promise<ProviderResult> {
		const previous = this.completed.get(request.idempotencyKey)
		if (previous) return previous
		const ref = this.makeRef('refund')
		this.logger.log(
			`[MOCK] Возврат ${this.formatAmount(request.amount)} заказчику ${request.payerId} по заказу ${request.orderId} → ${ref}`,
		)
		const result = { success: true, providerRef: ref }
		this.completed.set(request.idempotencyKey, result)
		return result
	}

	isLive(): boolean {
		return false
	}

	private makeRef(kind: string): string {
		return `mock_${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
	}

	/** Копейки → читаемая строка для лога */
	private formatAmount(kopecks: number): string {
		return `${(kopecks / 100).toFixed(2)} ₽`
	}
}
