import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
	MailMessage,
	MailSender,
	MailTransport,
} from './mail-transport.interface'

/**
 * Unisender Go — транзакционная почта через HTTP API (основной транспорт).
 * Docs: https://godocs.unisender.ru/web-api-ref#email-send
 *
 * Хост зависит от дата-центра аккаунта (go1 / go2) — берём из env.
 */
@Injectable()
export class UnisenderTransport extends MailTransport {
	readonly name = 'unisender-go'

	constructor(private readonly config: ConfigService) {
		super()
	}

	private get apiKey(): string {
		return this.config.get<string>('UNISENDER_GO_API_KEY', '').trim()
	}

	private get host(): string {
		return this.config
			.get<string>('UNISENDER_GO_HOST', 'go1.unisender.ru')
			.trim()
	}

	isConfigured(): boolean {
		return Boolean(this.apiKey)
	}

	async send(message: MailMessage, sender: MailSender): Promise<void> {
		const url = `https://${this.host}/ru/transactional/api/v1/email/send.json`
		const body = {
			api_key: this.apiKey,
			message: {
				recipients: [{ email: message.to }],
				subject: message.subject,
				from_email: sender.fromEmail,
				from_name: sender.fromName,
				body: {
					plaintext: message.text,
					...(message.html ? { html: message.html } : {}),
				},
			},
		}

		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})

		const data = (await res.json().catch(() => null)) as {
			status?: string
			failed_emails?: Record<string, string>
			message?: string
			code?: number
		} | null

		if (!res.ok || data?.status !== 'success') {
			const reason =
				data?.message ??
				(data?.failed_emails
					? JSON.stringify(data.failed_emails)
					: `HTTP ${res.status}`)
			throw new Error(`Unisender Go отклонил письмо: ${reason}`)
		}
	}
}
