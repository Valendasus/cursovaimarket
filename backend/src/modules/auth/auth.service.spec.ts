import {
	BadRequestException,
	ConflictException,
	UnauthorizedException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { pickDefaultAvatar } from '@/common/avatars'
import { AuthService } from './auth.service'

jest.mock('bcrypt', () => ({
	hash: jest.fn(),
	compare: jest.fn(),
}))
jest.mock('@/common/avatars', () => ({ pickDefaultAvatar: jest.fn() }))

const user = {
	id: 'user-1',
	email: 'user@example.com',
	name: 'user_name',
	password: 'hashed',
	role: UserRole.STUDENT,
	avatar: 's3://bucket/avatar.png',
	emailVerified: false,
	profile: null,
}

function build() {
	const prisma = {
		user: {
			findUnique: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		refreshSession: {
			create: jest.fn().mockResolvedValue({}),
			findUnique: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
		},
		emailVerificationToken: {
			findUnique: jest.fn(),
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
			create: jest.fn().mockResolvedValue({}),
			update: jest.fn().mockReturnValue({ updateToken: true }),
		},
		passwordResetToken: {
			findUnique: jest.fn(),
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
			create: jest.fn().mockResolvedValue({}),
			updateMany: jest.fn().mockResolvedValue({ count: 1 }),
		},
		$transaction: jest.fn().mockResolvedValue([]),
	}
	const jwt = {
		signAsync: jest
			.fn()
			.mockResolvedValueOnce('access-token')
			.mockResolvedValueOnce('refresh-token'),
		verifyAsync: jest.fn(),
		decode: jest.fn().mockReturnValue({ exp: 2_000_000_000 }),
	}
	const config = {
		get: jest.fn((key: string, fallback?: string) => {
			const values: Record<string, string> = {
				JWT_SECRET: 'access-secret',
				JWT_REFRESH_SECRET: 'refresh-secret',
				JWT_EXPIRES_IN: '15m',
				JWT_REFRESH_EXPIRES_IN: '30d',
				EMAIL_VERIFICATION_EXPIRES_IN: '24h',
			}
			return values[key] ?? fallback
		}),
	}
	const s3 = {
		signUrl: jest.fn().mockResolvedValue('https://signed.example/avatar.png'),
	}
	const mail = {
		sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
		sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
	}
	const service = new AuthService(
		prisma as never,
		jwt as never,
		config as never,
		s3 as never,
		mail as never,
	)
	return { service, prisma, jwt, config, s3, mail }
}

describe('AuthService', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed')
		;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
		;(pickDefaultAvatar as jest.Mock).mockReturnValue('/default.png')
	})

	it('registers a student, sends verification and persists refresh session', async () => {
		const { service, prisma, mail, s3 } = build()
		prisma.user.findUnique
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null)
		prisma.user.create.mockResolvedValue(user)

		const result = await service.register({
			name: user.name,
			email: user.email,
			password: 'Password123!',
			role: UserRole.STUDENT,
		})

		expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10)
		expect(prisma.user.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ avatar: '/default.png' }),
			}),
		)
		expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
			user.email,
			expect.stringMatching(/^[a-f0-9]{64}$/),
		)
		expect(prisma.refreshSession.create).toHaveBeenCalled()
		expect(s3.signUrl).toHaveBeenCalledWith(user.avatar)
		expect(result).toMatchObject({
			accessToken: 'access-token',
			refreshToken: 'refresh-token',
			user: { id: user.id, avatar: 'https://signed.example/avatar.png' },
		})
		expect(result.user).not.toHaveProperty('password')
	})

	it('creates a freelancer profile and tolerates mail failure', async () => {
		const { service, prisma, mail } = build()
		prisma.user.findUnique
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null)
		prisma.user.create.mockResolvedValue({
			...user,
			role: UserRole.FREELANCER,
			profile: {},
		})
		mail.sendVerificationEmail.mockRejectedValue(new Error('smtp down'))

		await expect(
			service.register({
				name: user.name,
				email: user.email,
				password: 'Password123!',
				role: UserRole.FREELANCER,
			}),
		).resolves.toBeDefined()
		expect(prisma.user.create.mock.calls[0][0].data.profile).toEqual({
			create: {},
		})
	})

	it('rejects admin registration and duplicate email or name', async () => {
		const first = build()
		await expect(
			first.service.register({
				name: 'admin',
				email: 'admin@example.com',
				password: 'Password123!',
				role: UserRole.ADMIN,
			}),
		).rejects.toBeInstanceOf(BadRequestException)

		const duplicateEmail = build()
		duplicateEmail.prisma.user.findUnique.mockResolvedValue(user)
		await expect(
			duplicateEmail.service.register({
				name: 'other',
				email: user.email,
				password: 'Password123!',
				role: UserRole.STUDENT,
			}),
		).rejects.toBeInstanceOf(ConflictException)

		const duplicateName = build()
		duplicateName.prisma.user.findUnique
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(user)
		await expect(
			duplicateName.service.register({
				name: user.name,
				email: 'other@example.com',
				password: 'Password123!',
				role: UserRole.STUDENT,
			}),
		).rejects.toBeInstanceOf(ConflictException)
	})

	it('logs in a valid user and rejects missing or invalid credentials', async () => {
		const valid = build()
		valid.prisma.user.findUnique.mockResolvedValue(user)
		await expect(
			valid.service.login({ email: user.email, password: 'Password123!' }),
		).resolves.toMatchObject({ accessToken: 'access-token' })

		const missing = build()
		missing.prisma.user.findUnique.mockResolvedValue(null)
		await expect(
			missing.service.login({ email: user.email, password: 'bad-pass' }),
		).rejects.toBeInstanceOf(UnauthorizedException)

		const invalid = build()
		invalid.prisma.user.findUnique.mockResolvedValue(user)
		;(bcrypt.compare as jest.Mock).mockResolvedValueOnce(false)
		await expect(
			invalid.service.login({ email: user.email, password: 'bad-pass' }),
		).rejects.toBeInstanceOf(UnauthorizedException)
	})

	it('rejects password login for an OAuth-only account without calling bcrypt', async () => {
		const { service, prisma } = build()
		prisma.user.findUnique.mockResolvedValue({ ...user, password: null })
		await expect(
			service.login({ email: user.email, password: 'Password123!' }),
		).rejects.toBeInstanceOf(UnauthorizedException)
		expect(bcrypt.compare).not.toHaveBeenCalled()
	})

	it('rotates an active refresh session', async () => {
		const { service, prisma, jwt } = build()
		jwt.verifyAsync.mockResolvedValue({
			sub: user.id,
			email: user.email,
			role: user.role,
			jti: 'old-jti',
		})
		prisma.user.findUnique.mockResolvedValue(user)
		prisma.refreshSession.findUnique.mockResolvedValue({
			jti: 'old-jti',
			userId: user.id,
			revokedAt: null,
		})

		await expect(service.refresh('old-token')).resolves.toMatchObject({
			accessToken: 'access-token',
			refreshToken: 'refresh-token',
		})
		expect(prisma.refreshSession.update).toHaveBeenCalledWith({
			where: { jti: 'old-jti' },
			data: { revokedAt: expect.any(Date) },
		})
	})

	it('rejects invalid, unknown-user and reused refresh tokens', async () => {
		const invalid = build()
		invalid.jwt.verifyAsync.mockRejectedValue(new Error('invalid'))
		await expect(invalid.service.refresh('bad')).rejects.toBeInstanceOf(
			UnauthorizedException,
		)

		const missing = build()
		missing.jwt.verifyAsync.mockResolvedValue({ sub: 'missing' })
		missing.prisma.user.findUnique.mockResolvedValue(null)
		await expect(missing.service.refresh('token')).rejects.toBeInstanceOf(
			UnauthorizedException,
		)

		const reused = build()
		reused.jwt.verifyAsync.mockResolvedValue({ sub: user.id, jti: 'used' })
		reused.prisma.user.findUnique.mockResolvedValue(user)
		reused.prisma.refreshSession.findUnique.mockResolvedValue({
			userId: user.id,
			revokedAt: new Date(),
		})
		await expect(reused.service.refresh('used-token')).rejects.toBeInstanceOf(
			UnauthorizedException,
		)
		expect(reused.prisma.refreshSession.updateMany).toHaveBeenCalled()
	})

	it('logs out a token session and ignores an invalid token', async () => {
		const { service, prisma, jwt } = build()
		jwt.verifyAsync.mockResolvedValue({ jti: 'session-jti' })
		await expect(service.logout('token')).resolves.toEqual({
			message: 'Выход выполнен',
		})
		expect(prisma.refreshSession.updateMany).toHaveBeenCalled()

		jwt.verifyAsync.mockRejectedValueOnce(new Error('invalid'))
		await expect(service.logout('invalid')).resolves.toEqual({
			message: 'Выход выполнен',
		})
		await expect(service.logout()).resolves.toEqual({
			message: 'Выход выполнен',
		})
	})

	it('verifies a valid email token and rejects invalid records', async () => {
		const { service, prisma } = build()
		prisma.emailVerificationToken.findUnique.mockResolvedValue({
			token: 'valid',
			userId: user.id,
			usedAt: null,
			expiresAt: new Date(Date.now() + 60_000),
		})
		await expect(service.verifyEmail('valid')).resolves.toEqual({
			message: 'Email подтверждён',
		})
		expect(prisma.$transaction).toHaveBeenCalled()

		prisma.emailVerificationToken.findUnique.mockResolvedValueOnce(null)
		await expect(service.verifyEmail('missing')).rejects.toBeInstanceOf(
			BadRequestException,
		)
		prisma.emailVerificationToken.findUnique.mockResolvedValueOnce({
			usedAt: new Date(),
			expiresAt: new Date(Date.now() + 60_000),
		})
		await expect(service.verifyEmail('used')).rejects.toBeInstanceOf(
			BadRequestException,
		)
	})

	it('resends only for an existing unverified account', async () => {
		const { service, prisma, mail } = build()
		prisma.user.findUnique.mockResolvedValue(user)
		await expect(service.resendVerification(user.email)).resolves.toEqual(
			expect.objectContaining({ message: expect.any(String) }),
		)
		expect(mail.sendVerificationEmail).toHaveBeenCalled()

		jest.clearAllMocks()
		prisma.user.findUnique.mockResolvedValue({ ...user, emailVerified: true })
		await service.resendVerification(user.email)
		expect(mail.sendVerificationEmail).not.toHaveBeenCalled()
	})

	it('emails an authenticated user a hashed, expiring password reset token', async () => {
		const { service, prisma, mail } = build()
		prisma.user.findUnique.mockResolvedValue(user)

		await expect(service.requestPasswordChange(user.id)).resolves.toEqual({
			message: expect.stringContaining(user.email),
		})

		const rawToken = mail.sendPasswordResetEmail.mock.calls[0][1]
		const saved = prisma.passwordResetToken.create.mock.calls[0][0].data
		expect(mail.sendPasswordResetEmail).toHaveBeenCalledWith(
			user.email,
			rawToken,
		)
		expect(saved.tokenHash).toBe(
			createHash('sha256').update(rawToken).digest('hex'),
		)
		expect(saved.tokenHash).not.toBe(rawToken)
		expect(saved.userId).toBe(user.id)
		expect(saved.expiresAt).toBeInstanceOf(Date)
	})

	it('resets the password once and revokes all active refresh sessions', async () => {
		const { service, prisma } = build()
		prisma.passwordResetToken.findUnique.mockResolvedValue({
			id: 'reset-1',
			userId: user.id,
			usedAt: null,
			expiresAt: new Date(Date.now() + 60_000),
		})
		prisma.$transaction.mockImplementation(async (callback) => callback(prisma))
		;(bcrypt.hash as jest.Mock).mockResolvedValueOnce('new-hash')

		await expect(
			service.resetPassword('raw-token', 'NewPassword123!'),
		).resolves.toEqual({ message: expect.stringContaining('Пароль') })

		expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
			where: {
				tokenHash: createHash('sha256').update('raw-token').digest('hex'),
			},
		})
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: user.id },
			data: { password: 'new-hash' },
		})
		expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
			where: { userId: user.id, revokedAt: null },
			data: { revokedAt: expect.any(Date) },
		})
	})

	it('rejects missing, expired and concurrently consumed reset links', async () => {
		const missing = build()
		missing.prisma.passwordResetToken.findUnique.mockResolvedValue(null)
		await expect(
			missing.service.resetPassword('missing', 'NewPassword123!'),
		).rejects.toBeInstanceOf(BadRequestException)

		const expired = build()
		expired.prisma.passwordResetToken.findUnique.mockResolvedValue({
			id: 'expired',
			userId: user.id,
			usedAt: null,
			expiresAt: new Date(Date.now() - 1),
		})
		await expect(
			expired.service.resetPassword('expired', 'NewPassword123!'),
		).rejects.toBeInstanceOf(BadRequestException)

		const consumed = build()
		consumed.prisma.passwordResetToken.findUnique.mockResolvedValue({
			id: 'reset-1',
			userId: user.id,
			usedAt: null,
			expiresAt: new Date(Date.now() + 60_000),
		})
		consumed.prisma.passwordResetToken.updateMany.mockResolvedValue({
			count: 0,
		})
		consumed.prisma.$transaction.mockImplementation(async (callback) =>
			callback(consumed.prisma),
		)
		await expect(
			consumed.service.resetPassword('used', 'NewPassword123!'),
		).rejects.toBeInstanceOf(BadRequestException)
		expect(consumed.prisma.user.update).not.toHaveBeenCalled()
	})

	it('sanitizes the current user', async () => {
		const { service } = build()
		await expect(service.getMe(user)).resolves.toEqual(
			expect.objectContaining({
				id: user.id,
				avatar: 'https://signed.example/avatar.png',
			}),
		)
	})
})
