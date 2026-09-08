import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { Roles } from '@/common/decorators/roles.decorator'
import { RolesGuard } from '@/common/guards/roles.guard'
import { S3Service } from '@/common/s3/s3.service'
import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { memoryStorage } from 'multer'
import { extname } from 'path'
import {
	SwitchRoleDto,
	UpdateProfileDto,
	UpdateUserDto,
} from './dto/update-user.dto'
import { UsersService } from './users.service'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(
		private readonly usersService: UsersService,
		private readonly s3Service: S3Service,
	) {}

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
		return this.usersService.findMe(userId)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Профиль пользователя по ID' })
	findOne(@Param('id') id: string) {
		return this.usersService.findPublicById(id)
	}

	@Patch('me')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Обновить свои данные' })
	updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
		return this.usersService.updateMe(userId, dto)
	}

	@Post('me/avatar')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				file: { type: 'string', format: 'binary' },
			},
		},
	})
	@UseInterceptors(
		FileInterceptor('file', {
			storage: memoryStorage(),
			fileFilter: (
				_req: Express.Request,
				file: Express.Multer.File,
				cb: (error: Error | null, acceptFile: boolean) => void,
			) => {
				if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
					return cb(
						new BadRequestException(
							'Допустимы только JPG, PNG или WebP',
						) as unknown as Error,
						false,
					)
				}
				return cb(null, true)
			},
			limits: { fileSize: 2 * 1024 * 1024 },
		}),
	)
	@ApiOperation({ summary: 'Загрузить аватар' })
	async uploadAvatar(
		@CurrentUser('id') userId: string,
		@UploadedFile() file: Express.Multer.File,
	) {
		if (!file) {
			throw new BadRequestException('Файл не загружен')
		}
		const ext = extname(file.originalname).toLowerCase()
		const key = `avatars/${userId}-${Date.now()}${ext}`
		const s3Ref = await this.s3Service.uploadBuffer(
			key,
			file.buffer,
			file.mimetype,
		)
		return this.usersService.updateAvatar(userId, s3Ref)
	}

	@Patch('me/profile')
	@UseGuards(AuthGuard('jwt'), RolesGuard)
	@Roles(UserRole.FREELANCER)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Обновить профиль фрилансера' })
	updateProfile(
		@CurrentUser('id') userId: string,
		@Body() dto: UpdateProfileDto,
	) {
		return this.usersService.updateProfile(userId, dto)
	}

	@Patch('me/role')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Сменить роль (заказчик ↔ исполнитель)' })
	switchRole(@CurrentUser('id') userId: string, @Body() dto: SwitchRoleDto) {
		return this.usersService.switchRole(userId, dto)
	}
}
