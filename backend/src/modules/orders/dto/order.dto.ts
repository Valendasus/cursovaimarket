import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrderStatus } from '@prisma/client'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateOrderDto {
	@ApiProperty({ description: 'ID пакета услуги' })
	@IsString()
	@IsNotEmpty()
	packageId: string

	@ApiPropertyOptional({ example: 'Требования к заказу...' })
	@IsOptional()
	@IsString()
	requirements?: string
}

export class UpdateOrderStatusDto {
	@ApiProperty({ enum: OrderStatus })
	@IsEnum(OrderStatus)
	status: OrderStatus
}
