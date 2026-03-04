import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Query,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get('freelancers')
	@ApiOperation({ summary: 'Список фрилансеров с пагинацией' })
	getFreelancers(
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
	) {
		return this.usersService.findFreelancers(page, limit)
	}

	@Get('me')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Мой профиль' })
	getMe(@CurrentUser('id') userId: string) {
		return this.usersService.findById(userId)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Профиль пользователя по ID' })
	findOne(@Param('id') id: string) {
		return this.usersService.findById(id)
	}

	@Patch('me')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Обновить свои данные' })
	updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
		return this.usersService.updateMe(userId, dto)
	}

	@Patch('me/profile')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Обновить профиль фрилансера' })
	updateProfile(
		@CurrentUser('id') userId: string,
		@Body() dto: UpdateProfileDto,
	) {
		return this.usersService.updateProfile(userId, dto)
	}
}
