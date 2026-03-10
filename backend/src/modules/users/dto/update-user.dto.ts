import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import {
	IsArray,
	IsEnum,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
} from 'class-validator'

export class UpdateUserDto {
	@ApiPropertyOptional({
		example: 'ivan_ivanov',
		description: 'Никнейм пользователя',
	})
	@IsOptional()
	@IsString()
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

	@ApiPropertyOptional({ example: 'https://t.me/username' })
	@IsOptional()
	@IsString()
	telegram?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	specializations?: string[]
}

export class SwitchRoleDto {
	@ApiProperty({ enum: UserRole, description: 'Целевая роль' })
	@IsEnum(UserRole)
	role: UserRole
}
