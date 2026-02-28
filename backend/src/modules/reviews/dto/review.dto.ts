import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator'

export class CreateReviewDto {
	@ApiProperty({ description: 'ID заказа' })
	@IsString()
	@IsNotEmpty()
	orderId: string

	@ApiProperty({ minimum: 1, maximum: 5 })
	@IsInt()
	@Min(1)
	@Max(5)
	rating: number

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	comment?: string
}
