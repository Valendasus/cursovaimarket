import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	@ApiOperation({ summary: 'Регистрация нового пользователя' })
	register(@Body() dto: RegisterDto) {
		return this.authService.register(dto)
	}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Вход в систему' })
	login(@Body() dto: LoginDto) {
		return this.authService.login(dto)
	}

	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Обновление access токена' })
	refresh(@Body() dto: RefreshTokenDto) {
		return this.authService.refresh(dto.refreshToken)
	}

	@Post('logout')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Выход из системы' })
	logout(@CurrentUser('id') userId: string) {
		return this.authService.logout(userId)
	}

	@Get('me')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Получить текущего пользователя' })
	getMe(@CurrentUser() user: any) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, ...safe } = user
		return safe
	}
}
