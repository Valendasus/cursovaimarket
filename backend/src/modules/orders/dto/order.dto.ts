import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrderStatus } from '@prisma/client'
import {
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
} from 'class-validator'

export class CreateOrderDto {
	@ApiProperty({ description: 'ID пакета услуги' })
	@IsString()
	@IsNotEmpty()
	packageId: string

	@ApiPropertyOptional({ example: 'Требования к заказу...', maxLength: 2000 })
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	requirements?: string
}

export class UpdateOrderStatusDto {
	@ApiProperty({ enum: OrderStatus })
	@IsEnum(OrderStatus)
	status: OrderStatus
}
