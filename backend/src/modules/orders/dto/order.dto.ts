import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrderStatus, RefundReason } from '@prisma/client'
import {
	IsBoolean,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator'

export class CreateOrderDto {
	@ApiProperty({ description: 'ID пакета услуги' })
	@IsString()
	@IsNotEmpty()
	packageId: string

	@ApiPropertyOptional({ example: 'Требования к заказу...', maxLength: 200 })
	@IsOptional()
	@IsString()
	@MaxLength(200)
	requirements?: string
}

export class UpdateOrderStatusDto {
	@ApiProperty({ enum: OrderStatus })
	@IsEnum(OrderStatus)
	status: OrderStatus
}

export class CreateDeadlineExtensionDto {
	@ApiProperty({ example: 3, minimum: 1, maximum: 30 })
	@IsInt()
	@Min(1)
	@Max(30)
	additionalDays: number

	@ApiProperty({ example: 'Нужны дополнительные расчёты', maxLength: 1000 })
	@IsString()
	@MinLength(10)
	@MaxLength(1000)
	reason: string
}

export class ResolveDeadlineExtensionDto {
	@ApiProperty({ description: 'Разрешить запрошенное продление' })
	@IsBoolean()
	approved: boolean
}

export class CreateRefundRequestDto {
	@ApiProperty({ enum: RefundReason })
	@IsEnum(RefundReason)
	reason: RefundReason

	@ApiProperty({
		example: 'Исполнитель не сдал работу в согласованный срок',
		maxLength: 2000,
	})
	@IsString()
	@MinLength(10)
	@MaxLength(2000)
	message: string
}
