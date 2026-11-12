import { pickDefaultAvatar } from '@/common/avatars'
import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	Injectable,
	ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuthAttempt, Prisma, UserRole } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'
import { isEmail } from 'class-validator'
import { AuthService } from './auth.service'

export const OAUTH_PROVIDERS = ['google', 'yandex'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]
export const OAUTH_TTL = 10 * 60 * 1000
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const random = () => randomBytes(32).toString('base64url')

export function safeOAuthRedirect(value?: string): string {
	if (
		!value ||
		value.length > 2048 ||
		!/^\/(?!\/)/.test(value) ||
		/[\\\s%]/.test(value.split(/[?#]/)[0]) ||
		Array.from(value).some(
			(char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
		)
	)
		return '/'
	return value
}

export class OAuthFailure extends Error {
	constructor(public readonly reason: string) {
		super(reason)
	}
}

type Identity = {
	subject: string
	email: string
	name: string
	verified: boolean
}

@Injectable()
export class OAuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
		private readonly auth: AuthService,
	) {}

	provider(value: string): OAuthProvider {
		if (value !== 'google' && value !== 'yandex')
			throw new BadRequestException('Неизвестный провайдер')
		return value
	}

	private settings(provider: OAuthProvider) {
		const prefix = provider.toUpperCase()
		const clientId = this.config.get<string>(`${prefix}_CLIENT_ID`)?.trim()
		const clientSecret = this.config
			.get<string>(`${prefix}_CLIENT_SECRET`)
			?.trim()
		const publicUrl = this.config
			.get<string>('PUBLIC_URL', 'http://localhost:3000')
			.replace(/\/$/, '')
		const callbackUrl =
			this.config.get<string>(`${prefix}_CALLBACK_URL`)?.trim() ||
			`${publicUrl}/api/v1/auth/oauth/${provider}/callback`
		if (!clientId || !clientSecret)
			throw new ServiceUnavailableException(
				'Вход через этого провайдера пока не настроен',
			)
		const url = new URL(callbackUrl)
		if (
			(url.protocol !== 'https:' &&
				!(
					url.protocol === 'http:' &&
					url.hostname === 'localhost' &&
					this.config.get('NODE_ENV') !== 'production'
				)) ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		) {
			throw new ServiceUnavailableException('Некорректный OAuth callback URL')
		}
		return { clientId, clientSecret, callbackUrl }
	}

	providers() {
		return Object.fromEntries(
			OAUTH_PROVIDERS.map((provider) => {
				try {
					this.settings(provider)
					return [provider, true]
				} catch {
					return [provider, false]
				}
			}),
		)
	}

	frontendOrigin() {
		return new URL(
			this.config.get<string>('FRONTEND_URL', 'http://localhost:5173'),
		).origin
	}

	resultUrl(params: Record<string, string>) {
		const url = new URL('/auth/callback', this.frontendOrigin())
		for (const [key, value] of Object.entries(params))
			url.searchParams.set(key, value)
		return url.toString()
	}

	async start(
		provider: OAuthProvider,
		role: UserRole,
		redirect?: string,
		linkUserId?: string,
	) {
		if (role !== UserRole.STUDENT && role !== UserRole.FREELANCER)
			throw new BadRequestException('Недопустимая роль')
		const { clientId, callbackUrl } = this.settings(provider)
		const state = random(),
			browserSecret = random(),
			codeVerifier = random()
		await this.prisma.oAuthAttempt.deleteMany({
			where: { expiresAt: { lt: new Date() } },
		})
		await this.prisma.oAuthAttempt.create({
			data: {
				stateHash: hash(state),
				browserHash: hash(browserSecret),
				provider,
				codeVerifier,
				role,
				redirect: safeOAuthRedirect(redirect),
				linkUserId,
				expiresAt: new Date(Date.now() + OAUTH_TTL),
			},
		})
		const url = new URL(
			provider === 'google'
				? 'https://accounts.google.com/o/oauth2/v2/auth'
				: 'https://oauth.yandex.ru/authorize',
		)
		url.search = new URLSearchParams({
			client_id: clientId,
			redirect_uri: callbackUrl,
			response_type: 'code',
			state,
			scope:
				provider === 'google'
					? 'openid email profile'
					: 'login:email login:info',
			code_challenge: createHash('sha256')
				.update(codeVerifier)
				.digest('base64url'),
			code_challenge_method: 'S256',
			...(provider === 'google'
				? { prompt: 'select_account' }
				: { force_confirm: 'yes' }),
		}).toString()
		return { url: url.toString(), browserSecret }
	}

	async consume(
		provider: OAuthProvider,
		state?: string,
		browserSecret?: string,
	) {
		if (
			!state ||
			!browserSecret ||
			!/^[\w-]{43}$/.test(state) ||
			!/^[\w-]{43}$/.test(browserSecret)
		)
			throw new OAuthFailure('invalid_state')
		const where = {
			stateHash: hash(state),
			browserHash: hash(browserSecret),
			provider,
			expiresAt: { gt: new Date() },
		}
		const attempt = await this.prisma.oAuthAttempt.findFirst({ where })
		if (!attempt) throw new OAuthFailure('invalid_state')
		// Atomic deletion prevents replay, including concurrent callback requests.
		const consumed = await this.prisma.oAuthAttempt.deleteMany({ where })
		if (consumed.count !== 1) throw new OAuthFailure('invalid_state')
		return attempt
	}

	private async json(
		url: string,
		init: RequestInit,
	): Promise<Record<string, unknown>> {
		const response = await fetch(url, {
			...init,
			signal: AbortSignal.timeout(10_000),
			redirect: 'error',
		})
		if (!response.ok) throw new OAuthFailure('provider_error')
		const data: unknown = await response.json()
		if (!data || typeof data !== 'object' || Array.isArray(data))
			throw new OAuthFailure('provider_error')
		return data as Record<string, unknown>
	}

	private async identity(
		provider: OAuthProvider,
		code: string,
		verifier: string,
	): Promise<Identity> {
		const { clientId, clientSecret, callbackUrl } = this.settings(provider)
		const token = await this.json(
			provider === 'google'
				? 'https://oauth2.googleapis.com/token'
				: 'https://oauth.yandex.ru/token',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code,
					client_id: clientId,
					client_secret: clientSecret,
					redirect_uri: callbackUrl,
					code_verifier: verifier,
				}).toString(),
			},
		)
		if (typeof token.access_token !== 'string' || !token.access_token)
			throw new OAuthFailure('provider_error')
		// Fetch identity directly over HTTPS with the server-exchanged token. We do
		// not decode/trust unvalidated id_tokens or accept profile data from clients.
		const profile = await this.json(
			provider === 'google'
				? 'https://openidconnect.googleapis.com/v1/userinfo'
				: 'https://login.yandex.ru/info?format=json',
			{
				headers: {
					Authorization: `${provider === 'google' ? 'Bearer' : 'OAuth'} ${token.access_token}`,
				},
			},
		)
		const subject = provider === 'google' ? profile.sub : profile.id
		if (provider === 'yandex' && profile.client_id !== clientId)
			throw new OAuthFailure('provider_error')
		const email = provider === 'google' ? profile.email : profile.default_email
		const name =
			provider === 'google'
				? profile.name
				: profile.display_name || profile.real_name || profile.login
		if (typeof subject !== 'string' || !subject || subject.length > 255)
			throw new OAuthFailure('provider_error')
		if (typeof email !== 'string' || !isEmail(email) || email.length > 254)
			throw new OAuthFailure('email_required')
		if (provider === 'google' && profile.email_verified !== true)
			throw new OAuthFailure('email_required')
		return {
			subject,
			email: email.toLowerCase(),
			name: typeof name === 'string' ? name : 'Пользователь',
			verified: provider === 'google' && profile.email_verified === true,
		}
	}

	async complete(provider: OAuthProvider, attempt: OAuthAttempt, code: string) {
		if (!code || code.length > 4096) throw new OAuthFailure('provider_error')
		const identity = await this.identity(provider, code, attempt.codeVerifier)
		const key = { provider_subject: { provider, subject: identity.subject } }
		const existing = await this.prisma.oAuthAccount.findUnique({ where: key })
		if (attempt.linkUserId) {
			if (existing && existing.userId !== attempt.linkUserId)
				throw new OAuthFailure('account_linked')
			if (!existing) {
				try {
					await this.prisma.oAuthAccount.create({
						data: {
							provider,
							subject: identity.subject,
							userId: attempt.linkUserId,
						},
					})
				} catch (e) {
					if (
						e instanceof Prisma.PrismaClientKnownRequestError &&
						e.code === 'P2002'
					)
						throw new OAuthFailure('account_linked')
					throw e
				}
			}
			return { linked: true as const, redirect: '/dashboard?tab=settings' }
		}
		let userId = existing?.userId
		if (!userId) {
			const emailOwner = await this.prisma.user.findFirst({
				where: { email: { equals: identity.email, mode: 'insensitive' } },
			})
			if (emailOwner) throw new OAuthFailure('account_exists')
			const baseName =
				identity.name
					.replace(/[^\u0400-\u04FFa-zA-Z0-9_\- ]/g, '')
					.trim()
					.slice(0, 36) || 'Пользователь'
			try {
				const user = await this.prisma.user.create({
					data: {
						email: identity.email,
						name: `${baseName}_${randomBytes(5).toString('hex')}`,
						role: attempt.role,
						avatar: pickDefaultAvatar(),
						emailVerified: identity.verified,
						emailVerifiedAt: identity.verified ? new Date() : null,
						...(attempt.role === UserRole.FREELANCER
							? { profile: { create: {} } }
							: {}),
						oauthAccounts: { create: { provider, subject: identity.subject } },
					},
				})
				userId = user.id
				if (!identity.verified)
					await this.auth.resendVerification(user.email).catch(() => {})
			} catch (e) {
				if (
					!(e instanceof Prisma.PrismaClientKnownRequestError) ||
					e.code !== 'P2002'
				)
					throw e
				// Another callback may have created this exact identity concurrently.
				const raced = await this.prisma.oAuthAccount.findUnique({ where: key })
				if (!raced) throw new OAuthFailure('account_exists')
				userId = raced.userId
			}
		}
		return {
			linked: false as const,
			redirect: attempt.redirect,
			refreshToken: await this.auth.createOAuthSession(userId),
		}
	}

	accounts(userId: string) {
		return this.prisma.oAuthAccount.findMany({
			where: { userId },
			select: { provider: true },
		})
	}
}
