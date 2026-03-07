import { Type } from 'class-transformer'
import {
	IsNotEmpty,
	IsOptional,
	IsPositive,
	IsString,
	MaxLength,
} from 'class-validator'

export class SendMessageDto {
	@IsString()
	@IsNotEmpty({ message: 'Сообщение не может быть пустым' })
	@MaxLength(2000, { message: 'Сообщение не может превышать 2000 символов' })
	content: string
}

export class GetMessagesDto {
	@IsOptional()
	@IsPositive()
	@Type(() => Number)
	page?: number = 1

	@IsOptional()
	@IsPositive()
	@Type(() => Number)
	limit?: number = 50
}
