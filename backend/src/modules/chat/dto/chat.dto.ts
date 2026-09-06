import { Type } from 'class-transformer'
import {
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsPositive,
	IsString,
	MaxLength,
	Min,
} from 'class-validator'

export class SendMessageDto {
	@IsOptional()
	@IsString()
	@MaxLength(64)
	clientMessageId?: string

	@IsOptional()
	@IsString()
	@MaxLength(2000, { message: 'Сообщение не может превышать 2000 символов' })
	content?: string

	@IsOptional()
	@IsString()
	@MaxLength(500)
	attachmentUrl?: string

	@IsOptional()
	@IsString()
	@MaxLength(200)
	attachmentName?: string

	@IsOptional()
	@IsString()
	@MaxLength(120)
	attachmentType?: string

	@IsOptional()
	@IsInt()
	@Min(0)
	attachmentSize?: number
}

export class CreateConversationDto {
	@IsString()
	@IsNotEmpty({ message: 'partnerId обязателен' })
	partnerId!: string
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
