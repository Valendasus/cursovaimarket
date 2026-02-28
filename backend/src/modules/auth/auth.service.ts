import { PrismaService } from '@/prisma/prisma.service'
import {
	ConflictException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { LoginDto, RegisterDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwt: JwtService,
		private config: ConfigService,
	) {}

	async register(dto: RegisterDto) {
		// Check if email exists
		const existing = await this.prisma.user.findUnique({
			where: { email: dto.email },
		})
		if (existing) {
			throw new ConflictException('Пользователь с таким email уже существует')
		}

		const hashedPassword = await bcrypt.hash(dto.password, 10)

		const user = await this.prisma.user.create({
			data: {
				name: dto.name,
				email: dto.email,
				password: hashedPassword,
				role: dto.role,
				// Create freelancer profile if registering as freelancer
				...(dto.role === UserRole.FREELANCER && {
					profile: { create: {} },
				}),
			},
			include: { profile: true },
		})

		const tokens = await this.generateTokens(user.id, user.email, user.role)
		await this.saveRefreshToken(user.id, tokens.refreshToken)

		return { user: this.sanitizeUser(user), ...tokens }
	}

	async login(dto: LoginDto) {
		const user = await this.prisma.user.findUnique({
			where: { email: dto.email },
			include: { profile: true },
		})

		if (!user) {
			throw new UnauthorizedException('Неверный email или пароль')
		}

		const passwordValid = await bcrypt.compare(dto.password, user.password)
		if (!passwordValid) {
			throw new UnauthorizedException('Неверный email или пароль')
		}

		const tokens = await this.generateTokens(user.id, user.email, user.role)
		await this.saveRefreshToken(user.id, tokens.refreshToken)

		return { user: this.sanitizeUser(user), ...tokens }
	}

	async refresh(refreshToken: string) {
		const stored = await this.prisma.refreshToken.findUnique({
			where: { token: refreshToken },
			include: { user: { include: { profile: true } } },
		})

		if (!stored || stored.expiresAt < new Date()) {
			throw new UnauthorizedException('Недействительный refresh token')
		}

		const tokens = await this.generateTokens(
			stored.user.id,
			stored.user.email,
			stored.user.role,
		)

		// Rotate token
		await this.prisma.refreshToken.delete({ where: { id: stored.id } })
		await this.saveRefreshToken(stored.user.id, tokens.refreshToken)

		return { user: this.sanitizeUser(stored.user), ...tokens }
	}

	async logout(userId: string) {
		await this.prisma.refreshToken.deleteMany({ where: { userId } })
		return { message: 'Выход выполнен' }
	}

	// ─── Helpers ───────────────────────────────────────────────────────────────

	private async generateTokens(userId: string, email: string, role: string) {
		const payload = { sub: userId, email, role }

		const [accessToken, refreshToken] = await Promise.all([
			this.jwt.signAsync(payload, {
				secret: this.config.get('JWT_SECRET'),
				expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
			}),
			this.jwt.signAsync(payload, {
				secret: this.config.get('JWT_REFRESH_SECRET'),
				expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
			}),
		])

		return { accessToken, refreshToken }
	}

	private async saveRefreshToken(userId: string, token: string) {
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 30)

		await this.prisma.refreshToken.create({
			data: { userId, token, expiresAt },
		})
	}

	private sanitizeUser(user: any) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, refreshTokens, ...safe } = user
		return safe
	}
}
