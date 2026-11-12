import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Throttle } from '@nestjs/throttler'
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { UserRole } from '@prisma/client'
import type { Request, Response } from 'express'
import { setRefreshCookie } from './auth.controller'
import { OAuthFailure, OAuthService, OAUTH_TTL } from './oauth.service'

class StartOAuthDto {
	@IsOptional()
	@IsIn([UserRole.STUDENT, UserRole.FREELANCER])
	role: UserRole = UserRole.STUDENT

	@IsOptional()
	@IsString()
	@MaxLength(2048)
	redirect?: string
}

const cookieOptions = () => ({
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	path: '/api/v1/auth/oauth',
})
const scalar = (value: unknown) =>
	typeof value === 'string' ? value : undefined

@Controller('auth/oauth')
export class OAuthController {
	constructor(private readonly oauth: OAuthService) {}

	@Get('providers')
	providers() {
		return this.oauth.providers()
	}

	@Get('accounts')
	@UseGuards(AuthGuard('jwt'))
	accounts(@CurrentUser() user: { id: string }) {
		return this.oauth.accounts(user.id)
	}

	private async begin(
		providerName: string,
		dto: StartOAuthDto,
		req: Request,
		res: Response,
		userId?: string,
	) {
		// Only our own frontend may initiate a browser-bound login or account link.
		if (req.headers.origin !== this.oauth.frontendOrigin())
			throw new ForbiddenException('Недопустимый источник запроса')
		const provider = this.oauth.provider(providerName)
		const { url, browserSecret } = await this.oauth.start(
			provider,
			dto.role,
			dto.redirect,
			userId,
		)
		res.cookie(`oauth_${provider}`, browserSecret, {
			...cookieOptions(),
			maxAge: OAUTH_TTL,
		})
		res.setHeader('Cache-Control', 'no-store')
		return { url }
	}

	@Post(':provider/start')
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	start(
		@Param('provider') provider: string,
		@Body() dto: StartOAuthDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		return this.begin(provider, dto, req, res)
	}

	@Post(':provider/link')
	@UseGuards(AuthGuard('jwt'))
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	link(
		@Param('provider') provider: string,
		@Body() dto: StartOAuthDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
		@CurrentUser() user: { id: string },
	) {
		return this.begin(provider, dto, req, res, user.id)
	}

	@Get(':provider/callback')
	async callback(
		@Param('provider') name: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		res.setHeader('Cache-Control', 'no-store')
		res.setHeader('Referrer-Policy', 'no-referrer')
		let redirect = '/'
		let mode = 'login'
		try {
			const provider = this.oauth.provider(name)
			const attempt = await this.oauth.consume(
				provider,
				scalar(req.query.state),
				scalar(req.cookies?.[`oauth_${provider}`]),
			)
			res.clearCookie(`oauth_${provider}`, cookieOptions())
			redirect = attempt.redirect
			mode = attempt.linkUserId ? 'link' : 'login'
			if (req.query.error) throw new OAuthFailure('cancelled')
			const result = await this.oauth.complete(
				provider,
				attempt,
				scalar(req.query.code) || '',
			)
			if (!result.linked) setRefreshCookie(res, result.refreshToken)
			return res.redirect(
				303,
				this.oauth.resultUrl({
					status: result.linked ? 'linked' : 'success',
					redirect: result.redirect,
				}),
			)
		} catch (e) {
			// Never forward provider descriptions, authorization codes or tokens.
			return res.redirect(
				303,
				this.oauth.resultUrl({
					error: e instanceof OAuthFailure ? e.reason : 'provider_error',
					redirect,
					mode,
				}),
			)
		}
	}
}
