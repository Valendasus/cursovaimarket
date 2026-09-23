import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import {
	IsEmail,
	IsIn,
	IsNotEmpty,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator'

// Роли, доступные при публичной регистрации (ADMIN выдаётся только вручную)
const SELF_REGISTER_ROLES = [UserRole.STUDENT, UserRole.FREELANCER] as const

export class RegisterDto {
	@ApiProperty({
		example: 'ivan_ivanov',
		description: 'Никнейм пользователя',
		minLength: 2,
		maxLength: 50,
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(2, { message: 'Имя минимум 2 символа' })
	@MaxLength(50, { message: 'Имя максимум 50 символов' })
	@Matches(/^[\u0400-\u04ffa-zA-Z0-9_\-\s]+$/, {
		message: 'Имя содержит недопустимые символы',
	})
	name: string

	@ApiProperty({ example: 'ivan@example.com' })
	@IsEmail({}, { message: 'Введите корректный email' })
	email: string

	@ApiProperty({ example: 'password123', minLength: 8, maxLength: 72 })
	@IsString()
	@MinLength(8, { message: 'Пароль минимум 8 символов' })
	@MaxLength(72, { message: 'Пароль максимум 72 символа' })
	password: string

	@ApiProperty({ enum: SELF_REGISTER_ROLES, default: UserRole.STUDENT })
	@IsIn(SELF_REGISTER_ROLES, {
		message: 'Можно зарегистрироваться только как STUDENT или FREELANCER',
	})
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

export class VerifyEmailDto {
	@ApiProperty({ description: 'Токен из ссылки подтверждения' })
	@IsString()
	@IsNotEmpty({ message: 'Токен обязателен' })
	@MaxLength(200)
	token: string
}

export class ResendVerificationDto {
	@ApiProperty({ example: 'ivan@example.com' })
	@IsEmail({}, { message: 'Введите корректный email' })
	email: string
}

export class ResetPasswordDto {
	@ApiProperty({ description: 'Одноразовый токен из ссылки в письме' })
	@IsString()
	@IsNotEmpty({ message: 'Токен обязателен' })
	@MaxLength(200)
	token: string

	@ApiProperty({ example: 'new-password123', minLength: 8, maxLength: 72 })
	@IsString()
	@MinLength(8, { message: 'Пароль минимум 8 символов' })
	@MaxLength(72, { message: 'Пароль максимум 72 символа' })
	password: string
}
