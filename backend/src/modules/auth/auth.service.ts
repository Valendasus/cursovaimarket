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
import { randomUUID } from 'crypto'
import { LoginDto, RegisterDto } from './dto/auth.dto'

const DEFAULT_AVATARS = [
	'https://api.dicebear.com/7.x/avataaars/svg?seed=ivan',
	'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
	'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
	'https://api.dicebear.com/7.x/avataaars/svg?seed=elena',
	'https://api.dicebear.com/7.x/avataaars/svg?seed=olga',
	'https://api.dicebear.com/7.x/avataaars/svg?seed=sergey',
]

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwt: JwtService,
		private config: ConfigService,
	) {}

	// ─── Register ──────────────────────────────────────────────────────────────

	async register(dto: RegisterDto) {
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
		const avatar =
			DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]

		const user = await this.prisma.user.create({
			data: {
				name: dto.name,
				email: dto.email,
				password: hashedPassword,
				role: dto.role,
				avatar,
				...(dto.role === UserRole.FREELANCER && {
					profile: { create: {} },
				}),
			},
			include: { profile: true },
		})

		const accessToken = await this.generateAccessToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)
		const refreshToken = await this.generateRefreshToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)

		return { user: this.sanitizeUser(user), accessToken, refreshToken }
	}

	// ─── Login ─────────────────────────────────────────────────────────────────

	async login(dto: LoginDto) {
		const user = await this.prisma.user.findUnique({
			where: { email: dto.email },
			include: { profile: true },
		})

		if (!user || !(await bcrypt.compare(dto.password, user.password))) {
			throw new UnauthorizedException('Неверный email или пароль')
		}

		const accessToken = await this.generateAccessToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)
		const refreshToken = await this.generateRefreshToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)

		return { user: this.sanitizeUser(user), accessToken, refreshToken }
	}

	// ─── Refresh (stateless — verify JWT from cookie) ──────────────────────────

	async refresh(refreshToken: string) {
		let payload: { sub: string; email: string; role: string }

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

		const accessToken = await this.generateAccessToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)
		const newRefreshToken = await this.generateRefreshToken(
			user.id,
			user.email,
			user.role,
			user.name,
		)

		return {
			user: this.sanitizeUser(user),
			accessToken,
			refreshToken: newRefreshToken,
		}
	}

	// ─── Logout ────────────────────────────────────────────────────────────────

	logout() {
		return { message: 'Выход выполнен' }
	}

	// ─── Helpers ───────────────────────────────────────────────────────────────

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

	private async generateRefreshToken(
		userId: string,
		email: string,
		role: string,
		name: string,
	) {
		return this.jwt.signAsync(
			{ sub: userId, email, role, name, jti: randomUUID() },
			{
				secret: this.config.get<string>('JWT_REFRESH_SECRET'),
				expiresIn: this.config.get<string>(
					'JWT_REFRESH_EXPIRES_IN',
					'30d',
				) as any,
			},
		)
	}

	private sanitizeUser(user: any) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = user
		return safe
	}
}
