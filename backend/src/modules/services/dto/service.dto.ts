import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ServiceCategory, ServiceLevel } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator'

export class CreatePackageDto {
	@ApiProperty({ example: 'Базовый' })
	@IsString()
	@IsNotEmpty()
	name: string

	@ApiProperty({ example: 50000, description: 'Цена в копейках' })
	@IsInt()
	@Min(0)
	price: number

	@ApiProperty({ example: 3, description: 'Срок выполнения в днях' })
	@IsInt()
	@Min(1)
	deliveryDays: number

	@ApiPropertyOptional({ example: 3, description: '-1 = без ограничений' })
	@IsOptional()
	@IsInt()
	@Min(-1)
	revisions?: number

	@ApiPropertyOptional({ example: 'Что входит в пакет' })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string

	@ApiPropertyOptional({ type: [String] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	features?: string[]
}

export class CreateServiceDto {
	@ApiProperty({ example: 'Написание курсовой по C++' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	title: string

	@ApiProperty({ example: 'Полное описание услуги...' })
	@IsString()
	@IsNotEmpty()
	description: string

	@ApiProperty({ enum: ServiceCategory })
	@IsEnum(ServiceCategory)
	category: ServiceCategory

	@ApiProperty({ enum: ServiceLevel })
	@IsEnum(ServiceLevel)
	level: ServiceLevel

	@ApiPropertyOptional({ type: [String] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[]

	@ApiPropertyOptional({ type: [String], description: 'URL изображений' })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	images?: string[]

	@ApiProperty({ type: [CreatePackageDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreatePackageDto)
	packages: CreatePackageDto[]
}

export class UpdateServiceDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(100)
	title?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	description?: string

	@ApiPropertyOptional({ enum: ServiceCategory })
	@IsOptional()
	@IsEnum(ServiceCategory)
	category?: ServiceCategory

	@ApiPropertyOptional({ enum: ServiceLevel })
	@IsOptional()
	@IsEnum(ServiceLevel)
	level?: ServiceLevel

	@ApiPropertyOptional({ type: [String] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[]

	@ApiPropertyOptional({ type: [String] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	images?: string[]
}

export class ServiceFiltersDto {
	@ApiPropertyOptional({ enum: ServiceCategory })
	@IsOptional()
	@IsEnum(ServiceCategory)
	category?: ServiceCategory

	@ApiPropertyOptional({ enum: ServiceLevel })
	@IsOptional()
	@IsEnum(ServiceLevel)
	level?: ServiceLevel

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	search?: string

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	freelancerId?: string

	@ApiPropertyOptional({ description: 'Только избранные услуги' })
	@IsOptional()
	@IsBoolean()
	@Transform(({ value }) => value === 'true' || value === true)
	isFeatured?: boolean

	@ApiPropertyOptional({ default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1

	@ApiPropertyOptional({ default: 12 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number = 12
}
