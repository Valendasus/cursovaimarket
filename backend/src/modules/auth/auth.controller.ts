import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import {
	LoginDto,
	RegisterDto,
	ResetPasswordDto,
	ResendVerificationDto,
	VerifyEmailDto,
} from './dto/auth.dto'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days in ms

export function setRefreshCookie(res: Response, token: string) {
	res.cookie(REFRESH_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
		maxAge: COOKIE_MAX_AGE,
		path: '/',
	})
}

function clearRefreshCookie(res: Response) {
	res.clearCookie(REFRESH_COOKIE, { path: '/' })
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('register')
	@ApiOperation({ summary: 'Регистрация нового пользователя' })
	async register(
		@Body() dto: RegisterDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const { user, accessToken, refreshToken } =
			await this.authService.register(dto)
		setRefreshCookie(res, refreshToken)
		return { user, accessToken }
	}

	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@Post('login')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Вход в систему' })
	async login(
		@Body() dto: LoginDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const { user, accessToken, refreshToken } =
			await this.authService.login(dto)
		setRefreshCookie(res, refreshToken)
		return { user, accessToken }
	}

	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Обновление access токена через httpOnly cookie' })
	async refresh(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const token: string | undefined = (req.cookies as Record<string, string>)[
			REFRESH_COOKIE
		]
		if (!token) throw new UnauthorizedException('Refresh token отсутствует')

		const { user, accessToken, refreshToken } =
			await this.authService.refresh(token)
		setRefreshCookie(res, refreshToken)
		return { user, accessToken }
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Выход из системы' })
	async logout(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const token: string | undefined = (req.cookies as Record<string, string>)[
			REFRESH_COOKIE
		]
		clearRefreshCookie(res)
		return this.authService.logout(token)
	}

	@Get('me')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Получить текущего пользователя' })
	getMe(@CurrentUser() user: any) {
		return this.authService.getMe(user)
	}

	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@Post('verify-email')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Подтвердить email по токену из письма' })
	verifyEmail(@Body() dto: VerifyEmailDto) {
		return this.authService.verifyEmail(dto.token)
	}

	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post('resend-verification')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Повторно отправить письмо подтверждения' })
	resendVerification(@Body() dto: ResendVerificationDto) {
		return this.authService.resendVerification(dto.email)
	}

	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post('password-change/request')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Отправить ссылку для смены пароля на email' })
	requestPasswordChange(@CurrentUser() user: { id: string }) {
		return this.authService.requestPasswordChange(user.id)
	}

	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('password-change/reset')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Сменить пароль по токену из письма' })
	async resetPassword(
		@Body() dto: ResetPasswordDto,
		@Res({ passthrough: true }) res: Response,
	) {
		const result = await this.authService.resetPassword(dto.token, dto.password)
		clearRefreshCookie(res)
		return result
	}
}
