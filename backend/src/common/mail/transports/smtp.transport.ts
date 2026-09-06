import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Transporter } from 'nodemailer'
import { createTransport } from 'nodemailer'
import {
	MailMessage,
	MailSender,
	MailTransport,
} from './mail-transport.interface'

/**
 * SMTP через nodemailer — запасной транспорт. Работает с любым провайдером
 * (Яндекс 360, Mail.ru для бизнеса, свой релей) — задаётся через env.
 * Транспортёр создаётся лениво и переиспользуется (пул соединений).
 */
@Injectable()
export class SmtpTransport extends MailTransport {
	readonly name = 'smtp'
	private transporter: Transporter | null = null

	constructor(private readonly config: ConfigService) {
		super()
	}

	private get host(): string {
		return this.config.get<string>('SMTP_HOST', '').trim()
	}

	private get port(): number {
		return Number(this.config.get<string>('SMTP_PORT', '465'))
	}

	private get user(): string {
		return this.config.get<string>('SMTP_USER', '').trim()
	}

	private get pass(): string {
		return this.config.get<string>('SMTP_PASS', '')
	}

	isConfigured(): boolean {
		return Boolean(this.host && this.user && this.pass)
	}

	private getTransporter(): Transporter {
		if (this.transporter) return this.transporter
		const port = this.port
		this.transporter = createTransport({
			host: this.host,
			port,
			// 465 — implicit TLS; 587/25 — STARTTLS
			secure: this.config.get<string>('SMTP_SECURE', port === 465 ? 'true' : 'false') === 'true',
			auth: { user: this.user, pass: this.pass },
		})
		return this.transporter
	}

	async send(message: MailMessage, sender: MailSender): Promise<void> {
		await this.getTransporter().sendMail({
			from: `${sender.fromName} <${sender.fromEmail}>`,
			to: message.to,
			subject: message.subject,
			text: message.text,
			...(message.html ? { html: message.html } : {}),
		})
	}
}
