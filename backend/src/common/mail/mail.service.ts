import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * Sends transactional emails.
 *
 * Dev mode (current): logs the message to the console instead of sending, so
 * the whole verification flow can be tested without an SMTP provider — the link
 * appears in the backend logs. To go live, implement `deliver()` with a real
 * provider (nodemailer/Resend); nothing else in the app needs to change.
 */
@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name)

	constructor(private readonly config: ConfigService) {}

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
	 * Actual delivery. Dev: log to console. Replace with a provider for prod.
	 */
	private async deliver(message: {
		to: string
		subject: string
		text: string
	}): Promise<void> {
		const isProd = process.env.NODE_ENV === 'production'
		if (isProd) {
			// No provider wired yet — warn loudly so prod doesn't silently swallow mail.
			this.logger.warn(
				`Почтовый провайдер не настроен — письмо для ${message.to} не отправлено`,
			)
			return
		}
		this.logger.log(
			`[DEV MAIL] → ${message.to}\n  ${message.subject}\n  ${message.text.replace(/\n/g, '\n  ')}`,
		)
	}
}
