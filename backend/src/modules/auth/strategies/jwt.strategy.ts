import { PrismaService } from '@/prisma/prisma.service'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

export interface JwtPayload {
	sub: string
	email: string
	role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		config: ConfigService,
		private prisma: PrismaService,
	) {
		const jwtSecret = config.get<string>('JWT_SECRET')
		if (!jwtSecret) {
			throw new Error('JWT_SECRET is not set')
		}
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: jwtSecret,
			ignoreExpiration: false,
		})
	}

	async validate(payload: JwtPayload) {
		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				avatar: true,
				createdAt: true,
				updatedAt: true,
				profile: true,
			},
		})
		// If user was deleted after token was issued — reject
		if (!user) throw new UnauthorizedException('Пользователь не найден')
		return user
	}
}
