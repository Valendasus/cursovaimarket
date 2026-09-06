import { Injectable, Logger } from '@nestjs/common'
import {
	ChargeRequest,
	PaymentProvider,
	PayoutRequest,
	ProviderResult,
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

	async charge(request: ChargeRequest): Promise<ProviderResult> {
		const ref = this.makeRef('charge')
		this.logger.log(
			`[MOCK] Списание ${this.formatAmount(request.amount)} по заказу ${request.orderId} → ${ref}`,
		)
		return { success: true, providerRef: ref }
	}

	async payout(request: PayoutRequest): Promise<ProviderResult> {
		const ref = this.makeRef('payout')
		this.logger.log(
			`[MOCK] Выплата ${this.formatAmount(request.amount)} исполнителю ${request.payeeId} по заказу ${request.orderId} → ${ref}`,
		)
		return { success: true, providerRef: ref }
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
