import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { MailService } from './mail.service'
import { MailTransport } from './transports/mail-transport.interface'

/**
 * Проверяем логику выбора транспорта и fallback, не трогая сеть.
 * Реальную доставку (Unisender/SMTP) здесь не тестируем — кредов нет,
 * и это внешние сервисы.
 */

class FakeTransport extends MailTransport {
	send = jest.fn().mockResolvedValue(undefined)
	constructor(
		readonly name: string,
		private configured: boolean,
	) {
		super()
	}
	isConfigured() {
		return this.configured
	}
}

function makeConfig() {
	return {
		get: jest.fn((key: string, def?: unknown) => def),
	} as unknown as ConfigService
}

// deliver — private; дёргаем через публичный sendVerificationEmail
function build(transports: MailTransport[]) {
	const svc = new MailService(makeConfig(), null as never, null as never)
	// подменяем собранный в конструкторе список
	;(svc as unknown as { transports: MailTransport[] }).transports = transports
	return svc
}

describe('MailService — выбор транспорта и fallback', () => {
	beforeEach(() => {
		jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
	})
	afterEach(() => jest.restoreAllMocks())

	it('шлёт через первый настроенный транспорт', async () => {
		const primary = new FakeTransport('primary', true)
		const backup = new FakeTransport('backup', true)
		await build([primary, backup]).sendVerificationEmail('a@b.ru', 'tok')

		expect(primary.send).toHaveBeenCalledTimes(1)
		expect(backup.send).not.toHaveBeenCalled()
	})

	it('пропускает ненастроенный основной и берёт запасной', async () => {
		const primary = new FakeTransport('primary', false)
		const backup = new FakeTransport('backup', true)
		await build([primary, backup]).sendVerificationEmail('a@b.ru', 'tok')

		expect(primary.send).not.toHaveBeenCalled()
		expect(backup.send).toHaveBeenCalledTimes(1)
	})

	it('падение основного → fallback на запасной', async () => {
		const primary = new FakeTransport('primary', true)
		primary.send.mockRejectedValueOnce(new Error('boom'))
		const backup = new FakeTransport('backup', true)
		await build([primary, backup]).sendVerificationEmail('a@b.ru', 'tok')

		expect(primary.send).toHaveBeenCalledTimes(1)
		expect(backup.send).toHaveBeenCalledTimes(1)
	})

	it('нет настроенных транспортов — не бросает (флоу регистрации не падает)', async () => {
		const primary = new FakeTransport('primary', false)
		await expect(
			build([primary]).sendVerificationEmail('a@b.ru', 'tok'),
		).resolves.toBeUndefined()
		expect(primary.send).not.toHaveBeenCalled()
	})

	it('все настроенные упали — не бросает наружу', async () => {
		const primary = new FakeTransport('primary', true)
		primary.send.mockRejectedValue(new Error('down'))
		await expect(
			build([primary]).sendVerificationEmail('a@b.ru', 'tok'),
		).resolves.toBeUndefined()
	})

	it('ссылка верификации содержит токен', () => {
		const svc = build([])
		expect(svc.buildVerificationLink('abc123')).toContain(
			'/verify-email?token=abc123',
		)
	})
})
