import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { Roles } from '@/common/decorators/roles.decorator'
import { RolesGuard } from '@/common/guards/roles.guard'
import {
	buildAvatarPath,
	buildPublicUrl,
	resolveAvatarDir,
} from '@/common/uploads'
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
	Req,
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
import type { Request } from 'express'
import { diskStorage } from 'multer'
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
			storage: diskStorage({
				destination: (req, file, cb) => {
					cb(null, resolveAvatarDir())
				},
				filename: (
					req: Request,
					file: Express.Multer.File,
					cb: (error: Error | null, filename: string) => void,
				) => {
					const ext = extname(file.originalname).toLowerCase()
					const reqWithUser = req as Request & { user?: { id?: string } }
					const userId = reqWithUser.user?.id ?? 'user'
					cb(null, `${userId}-${Date.now()}${ext}`)
				},
			}),
			fileFilter: (
				req: Request,
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
	uploadAvatar(
		@CurrentUser('id') userId: string,
		@UploadedFile() file: Express.Multer.File,
		@Req() req: Request,
	) {
		if (!file) {
			throw new BadRequestException('Файл не загружен')
		}
		const avatarPath = buildAvatarPath(file.filename)
		const avatarUrl = buildPublicUrl(avatarPath, req)
		return this.usersService.updateAvatar(userId, avatarUrl)
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
