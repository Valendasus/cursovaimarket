import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import {
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsString,
	MinLength,
} from 'class-validator'

export class RegisterDto {
	@ApiProperty({ example: 'Иван Иванов' })
	@IsString()
	@IsNotEmpty()
	name: string

	@ApiProperty({ example: 'ivan@example.com' })
	@IsEmail({}, { message: 'Введите корректный email' })
	email: string

	@ApiProperty({ example: 'password123', minLength: 8, maxLength: 72 })
	@IsString()
	@MinLength(8, { message: 'Пароль минимум 8 символов' })
	password: string

	@ApiProperty({ enum: UserRole, default: UserRole.STUDENT })
	@IsEnum(UserRole)
	role: UserRole = UserRole.STUDENT
}

export class LoginDto {
	@ApiProperty({ example: 'ivan@example.com' })
	@IsEmail()
	email: string

	@ApiProperty({ example: 'password123' })
	@IsString()
	@IsNotEmpty()
	password: string
}
