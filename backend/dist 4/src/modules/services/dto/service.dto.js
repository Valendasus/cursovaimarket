"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceFiltersDto = exports.UpdateServiceDto = exports.CreateServiceDto = exports.CreatePackageDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreatePackageDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, maxLength: 100 }, price: { required: true, type: () => Number, minimum: 1 }, deliveryDays: { required: true, type: () => Number, minimum: 1 }, revisions: { required: false, type: () => Number, minimum: -1 }, description: { required: false, type: () => String, maxLength: 500 }, features: { required: false, type: () => [String], maxLength: 200 } };
    }
}
exports.CreatePackageDto = CreatePackageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Базовый', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePackageDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50000, description: 'Цена в копейках (минимум 1)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreatePackageDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: 'Срок выполнения в днях' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreatePackageDto.prototype, "deliveryDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 3, description: '-1 = без ограничений' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(-1),
    __metadata("design:type", Number)
], CreatePackageDto.prototype, "revisions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Что входит в пакет' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreatePackageDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MaxLength)(200, { each: true }),
    __metadata("design:type", Array)
], CreatePackageDto.prototype, "features", void 0);
class CreateServiceDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: true, type: () => String, maxLength: 100 }, description: { required: true, type: () => String, maxLength: 5000 }, category: { required: true, type: () => Object }, level: { required: true, type: () => Object }, tags: { required: false, type: () => [String] }, images: { required: false, type: () => [String], format: "uri" }, packages: { required: true, type: () => [require("./service.dto").CreatePackageDto], minItems: 1 } };
    }
}
exports.CreateServiceDto = CreateServiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Написание курсовой по C++' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Полное описание услуги...', maxLength: 5000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ServiceCategory }),
    (0, class_validator_1.IsEnum)(client_1.ServiceCategory),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ServiceLevel }),
    (0, class_validator_1.IsEnum)(client_1.ServiceLevel),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateServiceDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], description: 'URL изображений' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUrl)({}, { each: true, message: 'Каждый элемент images должен быть URL' }),
    __metadata("design:type", Array)
], CreateServiceDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreatePackageDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePackageDto),
    __metadata("design:type", Array)
], CreateServiceDto.prototype, "packages", void 0);
class UpdateServiceDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: false, type: () => String, maxLength: 100 }, description: { required: false, type: () => String, maxLength: 5000 }, category: { required: false, type: () => Object }, level: { required: false, type: () => Object }, tags: { required: false, type: () => [String] }, images: { required: false, type: () => [String], format: "uri" } };
    }
}
exports.UpdateServiceDto = UpdateServiceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ServiceCategory }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ServiceCategory),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ServiceLevel }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ServiceLevel),
    __metadata("design:type", String)
], UpdateServiceDto.prototype, "level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateServiceDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUrl)({}, { each: true, message: 'Каждый элемент images должен быть URL' }),
    __metadata("design:type", Array)
], UpdateServiceDto.prototype, "images", void 0);
class ServiceFiltersDto {
    constructor() {
        this.page = 1;
        this.limit = 12;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { category: { required: false, type: () => Object }, level: { required: false, type: () => Object }, search: { required: false, type: () => String, maxLength: 200 }, freelancerId: { required: false, type: () => String }, isFeatured: { required: false, type: () => Boolean }, page: { required: false, type: () => Number, default: 1, minimum: 1 }, limit: { required: false, type: () => Number, default: 12, minimum: 1, maximum: 100 } };
    }
}
exports.ServiceFiltersDto = ServiceFiltersDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ServiceCategory }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ServiceCategory),
    __metadata("design:type", String)
], ServiceFiltersDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ServiceLevel }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ServiceLevel),
    __metadata("design:type", String)
], ServiceFiltersDto.prototype, "level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ServiceFiltersDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ServiceFiltersDto.prototype, "freelancerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Только избранные услуги' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], ServiceFiltersDto.prototype, "isFeatured", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ServiceFiltersDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 12, maximum: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ServiceFiltersDto.prototype, "limit", void 0);
//# sourceMappingURL=service.dto.js.map