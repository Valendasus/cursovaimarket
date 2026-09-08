/**
 * Контракт платёжного провайдера. Бизнес-логика знает только про него,
 * поэтому подключение реального провайдера (ЮKassa / Тинькофф) — это новый
 * класс, реализующий интерфейс, и одна строка в модуле. Ни orders.service,
 * ни контроллеры при этом не меняются.
 */

export interface ChargeRequest {
	/** Наш идентификатор заказа — уходит провайдеру, чтобы сверять в вебхуке */
	orderId: string
	/** Сумма к списанию с заказчика, в копейках */
	amount: number
	/** Кого списываем — для реального провайдера здесь будет токен карты */
	payerId: string
	description: string
}

export interface PayoutRequest {
	orderId: string
	/** Сумма к выплате исполнителю (сумма заказа минус комиссия), в копейках */
	amount: number
	payeeId: string
	description: string
}

export interface RefundRequest {
	orderId: string
	/** Сумма к возврату заказчику, в копейках */
	amount: number
	payerId: string
	description: string
}

export interface ProviderResult {
	success: boolean
	/** Идентификатор операции на стороне провайдера */
	providerRef?: string
	/** Причина отказа — попадает в Payment.failureReason */
	failureReason?: string
}

export abstract class PaymentProvider {
	/** Списать деньги с заказчика (депонирование в эскроу) */
	abstract charge(request: ChargeRequest): Promise<ProviderResult>

	/** Выплатить деньги исполнителю */
	abstract payout(request: PayoutRequest): Promise<ProviderResult>

	/** Вернуть деньги заказчику при отмене */
	abstract refund(request: RefundRequest): Promise<ProviderResult>

	/**
	 * Работает ли провайдер с настоящими деньгами. Фронт по этому флагу
	 * показывает плашку тестового режима вместо формы карты.
	 */
	abstract isLive(): boolean
}
