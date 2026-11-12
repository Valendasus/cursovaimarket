import type { Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { OAuthController } from './oauth.controller'
import { OAuthFailure } from './oauth.service'

function build() {
	const oauth = {
		frontendOrigin: () => 'http://localhost:5173',
		provider: () => 'google',
		start: jest
			.fn()
			.mockResolvedValue({
				url: 'https://accounts.google.com/authorize',
				browserSecret: 'binding',
			}),
		consume: jest
			.fn()
			.mockResolvedValue({ redirect: '/services', linkUserId: null }),
		complete: jest
			.fn()
			.mockResolvedValue({
				linked: false,
				redirect: '/services',
				refreshToken: 'session-secret',
			}),
		resultUrl: (params: Record<string, string>) =>
			`http://localhost:5173/auth/callback?${new URLSearchParams(params)}`,
	}
	const res = {
		cookie: jest.fn(),
		clearCookie: jest.fn(),
		setHeader: jest.fn(),
		redirect: jest.fn(),
	}
	const controller = new OAuthController(oauth as never)
	const req = {
		headers: { origin: 'http://localhost:5173' },
		query: { state: 'state', code: 'sensitive-code' },
		cookies: { oauth_google: 'binding' },
	} as unknown as Request
	return { oauth, res, req, controller, response: res as unknown as Response }
}

it('requires the configured frontend origin to initiate authorization', async () => {
	const { controller, oauth, req, response } = build()
	req.headers.origin = 'https://evil.example'
	await expect(
		controller.start('google', { role: UserRole.STUDENT }, req, response),
	).rejects.toThrow('Недопустимый источник')
	expect(oauth.start).not.toHaveBeenCalled()
})

it('sets a short-lived httpOnly Lax binding cookie and returns only authorization URL', async () => {
	const { controller, res, req, response } = build()
	await expect(
		controller.start('google', { role: UserRole.STUDENT }, req, response),
	).resolves.toEqual({ url: 'https://accounts.google.com/authorize' })
	expect(res.cookie).toHaveBeenCalledWith(
		'oauth_google',
		'binding',
		expect.objectContaining({
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 600_000,
			path: '/api/v1/auth/oauth',
		}),
	)
})

it('sets the regular refresh cookie but never redirects tokens or codes to the frontend', async () => {
	const { controller, res, req, response } = build()
	await controller.callback('google', req, response)
	expect(res.cookie).toHaveBeenCalledWith(
		'refresh_token',
		'session-secret',
		expect.objectContaining({ httpOnly: true }),
	)
	expect(res.redirect).toHaveBeenCalledWith(
		303,
		'http://localhost:5173/auth/callback?status=success&redirect=%2Fservices',
	)
	expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer')
})

it('consumes the bound state even when the user cancels, without exchanging code', async () => {
	const { controller, oauth, res, req, response } = build()
	req.query.error = 'access_denied'
	await controller.callback('google', req, response)
	expect(oauth.consume).toHaveBeenCalled()
	expect(oauth.complete).not.toHaveBeenCalled()
	expect(res.redirect.mock.calls[0][1]).toContain('error=cancelled')
	expect(res.cookie).not.toHaveBeenCalled()
})

it('does not exchange a code with invalid state or leak error details', async () => {
	const { controller, oauth, res, req, response } = build()
	oauth.consume.mockRejectedValue(new OAuthFailure('invalid_state'))
	await controller.callback('google', req, response)
	expect(oauth.complete).not.toHaveBeenCalled()
	expect(res.redirect.mock.calls[0][1]).toContain('error=invalid_state')
	oauth.consume.mockRejectedValue(
		new Error('sensitive database/provider details'),
	)
	await controller.callback('google', req, response)
	expect(res.redirect.mock.calls[1][1]).not.toContain('sensitive')
})

it('link callbacks never replace the current login cookie', async () => {
	const { controller, oauth, res, req, response } = build()
	oauth.complete.mockResolvedValue({
		linked: true,
		redirect: '/dashboard?tab=settings',
	})
	await controller.callback('google', req, response)
	expect(res.cookie).not.toHaveBeenCalled()
	expect(res.redirect.mock.calls[0][1]).toContain('status=linked')
})
