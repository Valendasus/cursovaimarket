import { pickDefaultAvatar } from '@/common/avatars'
import { MailService } from '@/common/mail/mail.service'
import { S3Service } from '@/common/s3/s3.service'
import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { createHash, randomBytes, randomUUID } from 'crypto'
import { LoginDto, RegisterDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name)

	constructor(
		private prisma: PrismaService,
		private jwt: JwtService,
		private config: ConfigService,
		private s3Service: S3Service,
		private mail: MailService,
	) {}

	// ─── Register ──────────────────────────────────────────────────────────────

	async register(dto: RegisterDto) {
		// Защита в глубину: даже в обход DTO нельзя самостоятельно стать ADMIN
		if (
			dto.role !== UserRole.STUDENT &&
			dto.role !== UserRole.FREELANCER
		) {
			throw new BadRequestException(
				'Можно зарегистрироваться только как STUDENT или FREELANCER',
			)
		}

		const existing = await this.prisma.user.findUnique({
			where: { email: dto.email },
		})
		if (existing) {
			throw new ConflictException('Пользователь с таким email уже существует')
		}

		const existingName = await this.prisma.user.findUnique({
			where: { name: dto.name },
		})
		if (existingName) {
			throw new ConflictException(
				'Пользователь с таким никнеймом уже существует',
			)
		}

		const hashedPassword = await bcrypt.hash(dto.password, 10)
		const avatar = pickDefaultAvatar()

		const user = await this.prisma.user.create({
			data: {
				name: dto.name,
				email: dto.email,
				password: hashedPassword,
				role: dto.role,
				...(avatar ? { avatar } : {}),
				...(dto.role === UserRole.FREELANCER && {
					profile: { create: {} },
				}),
			},
			include: { profile: true },
		})

		// Issue + send email verification. Must not break registration if mail fails.
		try {
			await this.issueAndSendVerification(user.id, user.email)
		} catch (e) {
			this.logger.error(
				`Не удалось отправить письмо подтверждения для ${user.email}`,
				(e as Error)?.stack,
			)
		}

		const accessToken = await this.generateAccessToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)
		const refreshToken = await this.issueRefreshToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)

		return {
			user: await this.sanitizeUser(user),
			accessToken,
			refreshToken,
		}
	}

	// ─── Login ─────────────────────────────────────────────────────────────────

	async login(dto: LoginDto) {
		const user = await this.prisma.user.findUnique({
			where: { email: dto.email },
			include: { profile: true },
		})

		if (!user?.password || !(await bcrypt.compare(dto.password, user.password))) {
			throw new UnauthorizedException('Неверный email или пароль')
		}

		const accessToken = await this.generateAccessToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)
		const refreshToken = await this.issueRefreshToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)

		return {
			user: await this.sanitizeUser(user),
			accessToken,
			refreshToken,
		}
	}

	/** OAuth uses the same revocable sessions as password login. */
	async createOAuthSession(userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } })
		if (!user) throw new UnauthorizedException('Пользователь не найден')
		return this.issueRefreshToken(user.id, user.email, user.role, user.name)
	}

	// ─── Refresh (rotating, revocable via RefreshSession) ──────────────────────

	async refresh(refreshToken: string) {
		let payload: { sub: string; email: string; role: string; jti?: string }

		try {
			payload = await this.jwt.verifyAsync(refreshToken, {
				secret: this.config.get<string>('JWT_REFRESH_SECRET'),
			})
		} catch {
			throw new UnauthorizedException('Недействительный refresh token')
		}

		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			include: { profile: true },
		})

		if (!user) {
			throw new UnauthorizedException('Пользователь не найден')
		}

		// Validate the refresh session (if the token carries a known jti).
		// A valid signature already proves authenticity, so a missing session row
		// means a legacy token (issued before this feature) → migrate it silently.
		if (payload.jti) {
			const session = await this.prisma.refreshSession.findUnique({
				where: { jti: payload.jti },
			})

			if (session && session.userId === user.id) {
				if (session.revokedAt) {
					// Reuse of an already-rotated/revoked token = stolen token.
					// Defensive: revoke every active session for this user.
					await this.prisma.refreshSession.updateMany({
						where: { userId: user.id, revokedAt: null },
						data: { revokedAt: new Date() },
					})
					throw new UnauthorizedException('Сессия отозвана')
				}
				// Rotate: invalidate the session this token belonged to.
				await this.prisma.refreshSession.update({
					where: { jti: payload.jti },
					data: { revokedAt: new Date() },
				})
			}
		}

		const accessToken = await this.generateAccessToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)
		const newRefreshToken = await this.issueRefreshToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)

		return {
			user: await this.sanitizeUser(user),
			accessToken,
			refreshToken: newRefreshToken,
		}
	}

	// ─── Logout ────────────────────────────────────────────────────────────────

	/** Revoke the session tied to the presented refresh token (this device only) */
	async logout(refreshToken?: string) {
		if (refreshToken) {
			try {
				const payload = await this.jwt.verifyAsync<{ jti?: string }>(
					refreshToken,
					{ secret: this.config.get<string>('JWT_REFRESH_SECRET') },
				)
				if (payload?.jti) {
					await this.prisma.refreshSession.updateMany({
						where: { jti: payload.jti, revokedAt: null },
						data: { revokedAt: new Date() },
					})
				}
			} catch {
				// Invalid/expired token on logout — nothing to revoke, ignore.
			}
		}
		return { message: 'Выход выполнен' }
	}

	// ─── Current user ──────────────────────────────────────────────────────────

	/** Normalize the authenticated user for /auth/me (sign the avatar URL) */
	async getMe(user: unknown) {
		return this.sanitizeUser(user)
	}

	// ─── Email verification ────────────────────────────────────────────────────

	/** Consume a verification token and mark the user's email as verified */
	async verifyEmail(token: string) {
		const record = await this.prisma.emailVerificationToken.findUnique({
			where: { token },
		})
		if (!record || record.usedAt || record.expiresAt < new Date()) {
			throw new BadRequestException(
				'Ссылка подтверждения недействительна или истекла',
			)
		}

		await this.prisma.$transaction([
			this.prisma.emailVerificationToken.update({
				where: { token },
				data: { usedAt: new Date() },
			}),
			this.prisma.user.update({
				where: { id: record.userId },
				data: { emailVerified: true, emailVerifiedAt: new Date() },
			}),
		])

		return { message: 'Email подтверждён' }
	}

	/**
	 * Re-send a verification email. Always returns a neutral message so the
	 * endpoint can't be used to probe which emails are registered.
	 */
	async resendVerification(email: string) {
		const user = await this.prisma.user.findUnique({ where: { email } })
		if (user && !user.emailVerified) {
			try {
				await this.issueAndSendVerification(user.id, user.email)
			} catch (e) {
				this.logger.error(
					`Не удалось повторно отправить письмо для ${user.email}`,
					(e as Error)?.stack,
				)
			}
		}
		return {
			message:
				'Если аккаунт существует и ещё не подтверждён, письмо отправлено',
		}
	}

	// ─── Password change by email ───────────────────────────────────────────

	/** Send a single-use password-change link to the authenticated user. */
	async requestPasswordChange(userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } })
		if (!user) throw new UnauthorizedException('Пользователь не найден')

		// Only the newest email link should remain usable.
		await this.prisma.passwordResetToken.deleteMany({
			where: { userId, usedAt: null },
		})

		const token = randomBytes(32).toString('hex')
		await this.prisma.passwordResetToken.create({
			data: {
				tokenHash: this.hashToken(token),
				userId,
				expiresAt: new Date(Date.now() + this.passwordResetTtlMs()),
			},
		})

		await this.mail.sendPasswordResetEmail(user.email, token)
		return { message: `Ссылка для смены пароля отправлена на ${user.email}` }
	}

	/** Consume a password reset token, replace the password and revoke sessions. */
	async resetPassword(token: string, password: string) {
		const record = await this.prisma.passwordResetToken.findUnique({
			where: { tokenHash: this.hashToken(token) },
		})
		const now = new Date()
		if (!record || record.usedAt || record.expiresAt < now) {
			throw new BadRequestException(
				'Ссылка для смены пароля недействительна или истекла',
			)
		}

		const hashedPassword = await bcrypt.hash(password, 10)
		await this.prisma.$transaction(async tx => {
			// updateMany makes token consumption atomic if the link is opened twice.
			const consumed = await tx.passwordResetToken.updateMany({
				where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
				data: { usedAt: now },
			})
			if (consumed.count !== 1) {
				throw new BadRequestException(
					'Ссылка для смены пароля уже использована',
				)
			}
			await tx.user.update({
				where: { id: record.userId },
				data: { password: hashedPassword },
			})
			await tx.refreshSession.updateMany({
				where: { userId: record.userId, revokedAt: null },
				data: { revokedAt: now },
			})
		})

		return { message: 'Пароль успешно изменён. Войдите с новым паролем' }
	}

	// ─── Helpers ───────────────────────────────────────────────────────────────

	/** Create a fresh single-use verification token and email it to the user */
	private async issueAndSendVerification(userId: string, email: string) {
		// Drop any previous unused tokens so only the latest link is valid
		await this.prisma.emailVerificationToken.deleteMany({
			where: { userId, usedAt: null },
		})

		const token = randomBytes(32).toString('hex')
		await this.prisma.emailVerificationToken.create({
			data: {
				token,
				userId,
				expiresAt: new Date(Date.now() + this.verificationTtlMs()),
			},
		})

		await this.mail.sendVerificationEmail(email, token)
	}

	/** Parse EMAIL_VERIFICATION_EXPIRES_IN (e.g. "24h", "30m", "7d") to ms */
	private verificationTtlMs(): number {
		const raw = this.config.get<string>(
			'EMAIL_VERIFICATION_EXPIRES_IN',
			'24h',
		)
		const match = /^(\d+)([smhd])$/.exec(raw.trim())
		const fallback = 24 * 60 * 60 * 1000
		if (!match) return fallback
		const value = Number(match[1])
		const unitMs: Record<string, number> = {
			s: 1000,
			m: 60_000,
			h: 3_600_000,
			d: 86_400_000,
		}
		return value * unitMs[match[2]]
	}

	private passwordResetTtlMs(): number {
		const raw = this.config.get<string>('PASSWORD_RESET_EXPIRES_IN', '1h')
		const match = /^(\d+)([smhd])$/.exec(raw.trim())
		const fallback = 60 * 60 * 1000
		if (!match) return fallback
		const unitMs: Record<string, number> = {
			s: 1000,
			m: 60_000,
			h: 3_600_000,
			d: 86_400_000,
		}
		return Number(match[1]) * unitMs[match[2]]
	}

	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex')
	}

	private async generateAccessToken(
		userId: string,
		email: string,
		role: string,
		name: string,
	) {
		return this.jwt.signAsync(
			{ sub: userId, email, role, name, jti: randomUUID() },
			{
				secret: this.config.get<string>('JWT_SECRET'),
				expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as any,
			},
		)
	}

	/**
	 * Signs a refresh token AND persists a matching RefreshSession row, so the
	 * token can later be revoked (logout / rotation / reuse-detection).
	 */
	private async issueRefreshToken(
		userId: string,
		email: string,
		role: string,
		name: string,
		userAgent?: string,
	) {
		const jti = randomUUID()
		const token = await this.jwt.signAsync(
			{ sub: userId, email, role, name, jti },
			{
				secret: this.config.get<string>('JWT_REFRESH_SECRET'),
				expiresIn: this.config.get<string>(
					'JWT_REFRESH_EXPIRES_IN',
					'30d',
				) as any,
			},
		)
		// Use the token's own exp claim as the session expiry (exact, no parsing)
		const decoded = this.jwt.decode(token) as { exp?: number } | null
		const expiresAt = decoded?.exp
			? new Date(decoded.exp * 1000)
			: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

		await this.prisma.refreshSession.create({
			data: {
				jti,
				userId,
				expiresAt,
				...(userAgent ? { userAgent } : {}),
			},
		})
		return token
	}

	private async sanitizeUser(user: any) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = user
		const avatar = await this.s3Service.signUrl(safe.avatar ?? undefined)
		return { ...safe, avatar: avatar ?? null }
	}
}
