/// <reference types="jest" />
import { ForbiddenException } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { EmailVerifiedGuard } from '@/common/guards/email-verified.guard'
import { ChatController } from './chat.controller'

/**
 * Регресс на закрытую дыру: HTTP-отправка сообщения (REST-фолбэк) должна быть
 * под тем же email-гейтом, что и WebSocket-путь. Без него неподтверждённый
 * пользователь при отвале сокета слал бы сообщения в обход проверки.
 */

function guardsOf(method: (...args: unknown[]) => unknown) {
	return (Reflect.getMetadata(GUARDS_METADATA, method) ?? []) as unknown[]
}

describe('EmailVerifiedGuard', () => {
	const guard = new EmailVerifiedGuard()

	function ctx(user: unknown) {
		return {
			switchToHttp: () => ({ getRequest: () => ({ user }) }),
		} as never
	}

	it('пропускает пользователя с подтверждённым email', () => {
		expect(guard.canActivate(ctx({ emailVerified: true }))).toBe(true)
	})

	it('блокирует неподтверждённого', () => {
		expect(() => guard.canActivate(ctx({ emailVerified: false }))).toThrow(
			ForbiddenException,
		)
	})

	it('блокирует, если пользователя нет в запросе', () => {
		expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException)
	})
})

describe('ChatController — email-гейт на отправке', () => {
	it('sendMessage защищён EmailVerifiedGuard', () => {
		const guards = guardsOf(ChatController.prototype.sendMessage)
		expect(guards).toContain(EmailVerifiedGuard)
	})

	it('чтение истории НЕ требует подтверждённого email', () => {
		const guards = guardsOf(ChatController.prototype.getMessages)
		expect(guards).not.toContain(EmailVerifiedGuard)
	})
})
