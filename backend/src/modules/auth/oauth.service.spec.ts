import { ConfigService } from '@nestjs/config'
import { Prisma, UserRole } from '@prisma/client'
import { createHash } from 'crypto'
import { OAuthFailure, OAuthService, safeOAuthRedirect } from './oauth.service'

function build(overrides: Record<string, string> = {}) {
	const prisma = {
		oAuthAttempt: {
			deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
			create: jest.fn(),
			findFirst: jest.fn(),
		},
		oAuthAccount: {
			findUnique: jest.fn().mockResolvedValue(null),
			create: jest.fn(),
			findMany: jest.fn(),
		},
		user: {
			findFirst: jest.fn().mockResolvedValue(null),
			create: jest
				.fn()
				.mockResolvedValue({ id: 'new-user', email: 'user@example.com' }),
		},
	}
	const auth = {
		createOAuthSession: jest.fn().mockResolvedValue('refresh'),
		resendVerification: jest.fn().mockResolvedValue({}),
	}
	const values: Record<string, string> = {
		GOOGLE_CLIENT_ID: 'google-id',
		GOOGLE_CLIENT_SECRET: 'google-secret',
		YANDEX_CLIENT_ID: 'yandex-id',
		YANDEX_CLIENT_SECRET: 'yandex-secret',
		...overrides,
	}
	const config = {
		get: (key: string, fallback?: string) => values[key] ?? fallback,
	} as ConfigService
	const service = new OAuthService(prisma as never, config, auth as never)
	return { service, prisma, auth }
}

const attempt = {
	stateHash: 'state-hash',
	browserHash: 'browser-hash',
	provider: 'google',
	codeVerifier: 'verifier',
	role: UserRole.STUDENT,
	redirect: '/services',
	linkUserId: null,
	expiresAt: new Date(Date.now() + 60_000),
}
const googleProfile = {
	sub: 'google-subject',
	email: 'user@example.com',
	email_verified: true,
	name: 'Иван',
}
let fetchMock: jest.SpyInstance
function profileResponse(profile: Record<string, unknown> = googleProfile) {
	fetchMock.mockResolvedValueOnce({
		ok: true,
		json: async () => ({ access_token: 'provider-token' }),
	})
	fetchMock.mockResolvedValueOnce({ ok: true, json: async () => profile })
}

beforeEach(() => {
	fetchMock = jest.spyOn(globalThis, 'fetch')
})
afterEach(() => {
	jest.restoreAllMocks()
})

describe('OAuth authorization flow', () => {
	it.each(['google', 'yandex'] as const)(
		'uses PKCE, random state and separate hashed browser binding for %s',
		async (provider) => {
			const { service, prisma } = build()
			const result = await service.start(
				provider,
				UserRole.FREELANCER,
				'//evil.example',
			)
			const url = new URL(result.url)
			const record = prisma.oAuthAttempt.create.mock.calls[0][0].data
			expect(url.searchParams.get('code_challenge_method')).toBe('S256')
			expect(url.searchParams.get('code_challenge')).toBe(
				createHash('sha256').update(record.codeVerifier).digest('base64url'),
			)
			expect(record.stateHash).toBe(
				createHash('sha256')
					.update(url.searchParams.get('state')!)
					.digest('hex'),
			)
			expect(record.browserHash).toBe(
				createHash('sha256').update(result.browserSecret).digest('hex'),
			)
			expect(record.redirect).toBe('/')
			expect(record.role).toBe('FREELANCER')
			expect(url.searchParams.get('state')).not.toBe(result.browserSecret)
			expect(result.url).not.toContain('secret')
		},
	)

	it('disables an unconfigured provider and does not create a state', async () => {
		const { service, prisma } = build({ GOOGLE_CLIENT_SECRET: '' })
		expect(service.providers()).toEqual({ google: false, yandex: true })
		await expect(service.start('google', UserRole.STUDENT)).rejects.toThrow()
		expect(prisma.oAuthAttempt.create).not.toHaveBeenCalled()
	})

	it('rejects ADMIN registration and unknown providers', async () => {
		const { service, prisma } = build()
		await expect(service.start('google', UserRole.ADMIN)).rejects.toThrow()
		expect(() => service.provider('evil')).toThrow()
		expect(prisma.oAuthAttempt.create).not.toHaveBeenCalled()
	})

	it('requires state, provider, browser binding and unexpired record', async () => {
		const { service, prisma } = build()
		prisma.oAuthAttempt.findFirst.mockResolvedValue(null)
		await expect(
			service.consume('google', 'a'.repeat(43), 'b'.repeat(43)),
		).rejects.toThrow('invalid_state')
		expect(prisma.oAuthAttempt.findFirst).toHaveBeenCalledWith({
			where: expect.objectContaining({
				provider: 'google',
				browserHash: expect.any(String),
				stateHash: expect.any(String),
				expiresAt: { gt: expect.any(Date) },
			}),
		})
		await expect(service.consume('google', 'a'.repeat(43))).rejects.toThrow(
			'invalid_state',
		)
		expect(prisma.oAuthAttempt.deleteMany).not.toHaveBeenCalled()
	})

	it('consumes state once and rejects a concurrently replayed callback', async () => {
		const { service, prisma } = build()
		prisma.oAuthAttempt.findFirst.mockResolvedValue(attempt)
		prisma.oAuthAttempt.deleteMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 })
		await expect(
			service.consume('google', 'a'.repeat(43), 'b'.repeat(43)),
		).resolves.toEqual(attempt)
		await expect(
			service.consume('google', 'a'.repeat(43), 'b'.repeat(43)),
		).rejects.toThrow('invalid_state')
	})

	it.each([
		'https://evil.example',
		'//evil.example',
		'/\\evil.example',
		'/%2f%2fevil.example',
		'/\t/evil.example',
	])('blocks external redirect %s', (value) => {
		expect(safeOAuthRedirect(value)).toBe('/')
	})
	it('preserves local destinations with query strings', () => {
		expect(safeOAuthRedirect('/dashboard?tab=settings')).toBe(
			'/dashboard?tab=settings',
		)
	})
})

describe('OAuth identities and accounts', () => {
	it('creates a passwordless Google freelancer with a verified email and normal session', async () => {
		const { service, prisma, auth } = build()
		profileResponse()
		await expect(
			service.complete(
				'google',
				{ ...attempt, role: UserRole.FREELANCER },
				'code',
			),
		).resolves.toEqual({
			linked: false,
			redirect: '/services',
			refreshToken: 'refresh',
		})
		const data = prisma.user.create.mock.calls[0][0].data
		expect(data).toMatchObject({
			role: 'FREELANCER',
			emailVerified: true,
			profile: { create: {} },
			oauthAccounts: {
				create: { provider: 'google', subject: 'google-subject' },
			},
		})
		expect(data.password).toBeUndefined()
		expect(auth.createOAuthSession).toHaveBeenCalledWith('new-user')
		expect(auth.resendVerification).not.toHaveBeenCalled()
		const body = new URLSearchParams(fetchMock.mock.calls[0][1].body)
		expect(body.get('code_verifier')).toBe('verifier')
		expect(body.get('client_secret')).toBe('google-secret')
		expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
			'Bearer provider-token',
		)
	})

	it('requests Yandex profile with OAuth header and sends site email verification', async () => {
		const { service, prisma, auth } = build()
		profileResponse({
			id: 'yandex-subject',
			client_id: 'yandex-id',
			default_email: 'User@Example.com',
			display_name: 'Иван',
		})
		await service.complete('yandex', { ...attempt, provider: 'yandex' }, 'code')
		expect(fetchMock.mock.calls[1][0]).toBe(
			'https://login.yandex.ru/info?format=json',
		)
		expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
			'OAuth provider-token',
		)
		expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
			emailVerified: false,
			email: 'user@example.com',
		})
		expect(auth.resendVerification).toHaveBeenCalledWith('user@example.com')
	})

	it('rejects Yandex tokens for another client', async () => {
		const { service } = build()
		profileResponse({
			id: 'yandex-subject',
			client_id: 'other-client',
			default_email: 'user@example.com',
		})
		await expect(service.complete('yandex', attempt, 'code')).rejects.toThrow(
			'provider_error',
		)
	})

	it('logs in by stable identity without creating users, changing roles or looking up email', async () => {
		const { service, prisma, auth } = build()
		profileResponse()
		prisma.oAuthAccount.findUnique.mockResolvedValue({
			userId: 'existing-user',
		})
		await service.complete(
			'google',
			{ ...attempt, role: UserRole.FREELANCER },
			'code',
		)
		expect(auth.createOAuthSession).toHaveBeenCalledWith('existing-user')
		expect(prisma.user.findFirst).not.toHaveBeenCalled()
		expect(prisma.user.create).not.toHaveBeenCalled()
	})

	it('never automatically links an existing matching email', async () => {
		const { service, prisma, auth } = build()
		profileResponse()
		prisma.user.findFirst.mockResolvedValue({ id: 'email-owner' })
		await expect(service.complete('google', attempt, 'code')).rejects.toThrow(
			'account_exists',
		)
		expect(prisma.oAuthAccount.create).not.toHaveBeenCalled()
		expect(auth.createOAuthSession).not.toHaveBeenCalled()
	})

	it('explicitly links to the authenticated initiating user without changing login session', async () => {
		const { service, prisma, auth } = build()
		profileResponse()
		await expect(
			service.complete('google', { ...attempt, linkUserId: 'owner' }, 'code'),
		).resolves.toMatchObject({ linked: true })
		expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
			data: { userId: 'owner', provider: 'google', subject: 'google-subject' },
		})
		expect(auth.createOAuthSession).not.toHaveBeenCalled()
		expect(prisma.user.create).not.toHaveBeenCalled()
	})

	it('cannot transfer another user’s linked identity', async () => {
		const { service, prisma } = build()
		profileResponse()
		prisma.oAuthAccount.findUnique.mockResolvedValue({ userId: 'someone-else' })
		await expect(
			service.complete('google', { ...attempt, linkUserId: 'owner' }, 'code'),
		).rejects.toThrow('account_linked')
		expect(prisma.oAuthAccount.create).not.toHaveBeenCalled()
	})

	it('does not replace an existing provider connection', async () => {
		const { service, prisma } = build()
		profileResponse()
		prisma.oAuthAccount.create.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('unique', {
				code: 'P2002',
				clientVersion: '5',
			}),
		)
		await expect(
			service.complete('google', { ...attempt, linkUserId: 'owner' }, 'code'),
		).rejects.toThrow('account_linked')
	})

	it.each([
		{ ...googleProfile, email: undefined },
		{ ...googleProfile, email_verified: false },
	])('rejects absent or unverified Google email', async (profile) => {
		const { service, prisma } = build()
		profileResponse(profile)
		await expect(service.complete('google', attempt, 'code')).rejects.toThrow(
			'email_required',
		)
		expect(prisma.user.create).not.toHaveBeenCalled()
	})

	it('fails closed when the provider rejects the token exchange', async () => {
		const { service, prisma, auth } = build()
		fetchMock.mockResolvedValueOnce({ ok: false })
		await expect(
			service.complete('google', attempt, 'code'),
		).rejects.toBeInstanceOf(OAuthFailure)
		expect(prisma.user.create).not.toHaveBeenCalled()
		expect(auth.createOAuthSession).not.toHaveBeenCalled()
	})
})
