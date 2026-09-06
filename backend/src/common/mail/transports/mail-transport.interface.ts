export interface MailMessage {
	to: string
	subject: string
	text: string
	html?: string
}

export interface MailSender {
	fromEmail: string
	fromName: string
}

/**
 * Один способ доставки письма (Unisender Go, SMTP, …). MailService перебирает
 * настроенные транспорты по порядку с fallback, поэтому все они за одним
 * интерфейсом.
 */
export abstract class MailTransport {
	/** Имя для логов */
	abstract readonly name: string

	/** Есть ли всё необходимое в конфиге, чтобы этим транспортом можно было слать */
	abstract isConfigured(): boolean

	/** Отправить письмо. Бросает при ошибке — решение о fallback за MailService */
	abstract send(message: MailMessage, sender: MailSender): Promise<void>
}
