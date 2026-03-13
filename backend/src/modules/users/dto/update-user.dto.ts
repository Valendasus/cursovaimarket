import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ServiceCategory, UserRole } from '@prisma/client'
import {
	IsArray,
	IsEnum,
	IsIn,
	IsOptional,
	IsString,
	IsUrl,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator'

export class UpdateUserDto {
	@ApiPropertyOptional({
		example: 'ivan_ivanov',
		description: 'Никнейм пользователя',
	})
	@IsOptional()
	@IsString()
	@MinLength(2, { message: 'Имя минимум 2 символа' })
	@MaxLength(50, { message: 'Имя максимум 50 символов' })
	name?: string

	@ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
	@IsOptional()
	@IsUrl()
	avatar?: string
}

export class UpdateProfileDto {
	@ApiPropertyOptional({ example: 'Студент МГТУ им. Баумана' })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	bio?: string

	@ApiPropertyOptional({
		example: '@username',
		description: 'Telegram username (без ссылки, начиная с @)',
	})
	@IsOptional()
	@IsString()
	@Matches(/^@?[A-Za-z0-9_]{3,32}$/, {
		message: 'Telegram: допустимы латиница, цифры и _, 3–32 символа',
	})
	telegram?: string

	@ApiPropertyOptional({ enum: ServiceCategory, isArray: true })
	@IsOptional()
	@IsArray()
	@IsEnum(ServiceCategory, {
		each: true,
		message: 'Неверная категория специализации',
	})
	specializations?: string[]
}

export class SwitchRoleDto {
	@ApiProperty({
		enum: [UserRole.STUDENT, UserRole.FREELANCER],
		description: 'Целевая роль',
	})
	@IsIn([UserRole.STUDENT, UserRole.FREELANCER], {
		message: 'Допустима только роль STUDENT или FREELANCER',
	})
	role: UserRole
}
