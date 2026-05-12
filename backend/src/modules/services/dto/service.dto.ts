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
	IsUrl,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator'

export class CreatePackageDto {
	@ApiProperty({ example: 'Базовый', maxLength: 100 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	name: string

	@ApiProperty({ example: 50000, description: 'Цена в копейках (минимум 1)' })
	@IsInt()
	@Min(1)
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
	@MaxLength(200, { each: true })
	features?: string[]
}

export class CreateServiceDto {
	@ApiProperty({ example: 'Написание курсовой по C++' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	title: string

	@ApiProperty({ example: 'Полное описание услуги...', maxLength: 5000 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(5000)
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
	@IsUrl({}, { each: true, message: 'Каждый элемент images должен быть URL' })
	images?: string[]

	@ApiProperty({ type: [CreatePackageDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreatePackageDto)
	packages: CreatePackageDto[]
}

export class UpdatePackageDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	id?: string

	@ApiProperty({ example: 'Базовый', maxLength: 100 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	name: string

	@ApiProperty({ example: 50000, description: 'Цена в копейках (минимум 1)' })
	@IsInt()
	@Min(1)
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
	@MaxLength(200, { each: true })
	features?: string[]
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
	@MaxLength(5000)
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
	@IsUrl({}, { each: true, message: 'Каждый элемент images должен быть URL' })
	images?: string[]

	@ApiPropertyOptional({ type: [UpdatePackageDto] })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => UpdatePackageDto)
	packages?: UpdatePackageDto[]
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
	@MaxLength(200)
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

	@ApiPropertyOptional({ default: 12, maximum: 100 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 12
}

export class PopularServicesDto {
	@ApiPropertyOptional({ default: 3, maximum: 12 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(12)
	limit?: number = 3
}
