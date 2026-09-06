import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MailSender, MailTransport } from './transports/mail-transport.interface'
import { SmtpTransport } from './transports/smtp.transport'
import { UnisenderTransport } from './transports/unisender.transport'

/**
 * Отправка транзакционных писем.
 *
 * Транспорты пробуются по порядку с fallback: основной — Unisender Go (HTTP
 * API), запасной — SMTP (nodemailer). Если ни один не настроен, письмо логируется
 * в консоль (dev) или помечается warning-ом (prod) — как было раньше, чтобы флоу
 * верификации работал и без кредов. Новый провайдер добавляется одним классом
 * MailTransport в список ниже.
 */
@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name)
	private readonly transports: MailTransport[]

	constructor(
		private readonly config: ConfigService,
		unisender: UnisenderTransport,
		smtp: SmtpTransport,
	) {
		// Порядок = приоритет: сначала Unisender Go, при сбое — SMTP.
		this.transports = [unisender, smtp]
	}

	private sender(): MailSender {
		return {
			fromEmail: this.config.get<string>(
				'MAIL_FROM_EMAIL',
				'noreply@example.com',
			),
			fromName: this.config.get<string>('MAIL_FROM_NAME', 'КурсовойМаркет'),
		}
	}

	/** Base URL of the frontend (where verification links point) */
	private frontendUrl(): string {
		const url =
			this.config.get<string>('FRONTEND_URL') ??
			this.config.get<string>('CORS_ORIGIN') ??
			'http://localhost:5173'
		return url.replace(/\/+$/, '')
	}

	buildVerificationLink(token: string): string {
		return `${this.frontendUrl()}/verify-email?token=${encodeURIComponent(token)}`
	}

	async sendVerificationEmail(email: string, token: string): Promise<void> {
		const link = this.buildVerificationLink(token)
		await this.deliver({
			to: email,
			subject: 'Подтверждение email — КурсовойМаркет',
			text: `Здравствуйте!\n\nПодтвердите ваш email, перейдя по ссылке:\n${link}\n\nЕсли вы не регистрировались — просто проигнорируйте это письмо.`,
		})
	}

	/**
	 * Перебирает настроенные транспорты по порядку, возвращается на первом успехе.
	 * Если сконфигурированный транспорт упал — логируем и пробуем следующий.
	 * Если настроенных нет — dev-лог / prod-warn (флоу верификации не падает).
	 */
	private async deliver(message: {
		to: string
		subject: string
		text: string
	}): Promise<void> {
		const configured = this.transports.filter(t => t.isConfigured())

		if (configured.length === 0) {
			const isProd = process.env.NODE_ENV === 'production'
			if (isProd) {
				this.logger.warn(
					`Почтовый транспорт не настроен — письмо для ${message.to} не отправлено`,
				)
			} else {
				this.logger.log(
					`[DEV MAIL] → ${message.to}\n  ${message.subject}\n  ${message.text.replace(/\n/g, '\n  ')}`,
				)
			}
			return
		}

		const sender = this.sender()
		for (const transport of configured) {
			try {
				await transport.send(message, sender)
				this.logger.log(`Письмо для ${message.to} отправлено (${transport.name})`)
				return
			} catch (e) {
				this.logger.warn(
					`Транспорт ${transport.name} не смог отправить письмо для ${message.to}: ${(e as Error).message}`,
				)
			}
		}

		// Дошли сюда — все настроенные транспорты упали
		this.logger.error(
			`Не удалось отправить письмо для ${message.to}: все транспорты (${configured
				.map(t => t.name)
				.join(', ')}) вернули ошибку`,
		)
	}
}
