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
exports.SwitchRoleDto = exports.UpdateProfileDto = exports.UpdateUserDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class UpdateUserDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String, minLength: 2, maxLength: 50 }, avatar: { required: false, type: () => String, format: "uri" } };
    }
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'ivan_ivanov',
        description: 'Никнейм пользователя',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Имя минимум 2 символа' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Имя максимум 50 символов' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://example.com/avatar.jpg' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "avatar", void 0);
class UpdateProfileDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { bio: { required: false, type: () => String, maxLength: 500 }, telegram: { required: false, type: () => String, pattern: "/^@?[A-Za-z0-9_]{3,32}$/" }, specializations: { required: false, type: () => [String] } };
    }
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Студент МГТУ им. Баумана' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "bio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '@username',
        description: 'Telegram username (без ссылки, начиная с @)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^@?[A-Za-z0-9_]{3,32}$/, {
        message: 'Telegram: допустимы латиница, цифры и _, 3–32 символа',
    }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "telegram", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ServiceCategory, isArray: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(client_1.ServiceCategory, {
        each: true,
        message: 'Неверная категория специализации',
    }),
    __metadata("design:type", Array)
], UpdateProfileDto.prototype, "specializations", void 0);
class SwitchRoleDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { role: { required: true, type: () => Object, enum: [client_1.UserRole.STUDENT, client_1.UserRole.FREELANCER] } };
    }
}
exports.SwitchRoleDto = SwitchRoleDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [client_1.UserRole.STUDENT, client_1.UserRole.FREELANCER],
        description: 'Целевая роль',
    }),
    (0, class_validator_1.IsIn)([client_1.UserRole.STUDENT, client_1.UserRole.FREELANCER], {
        message: 'Допустима только роль STUDENT или FREELANCER',
    }),
    __metadata("design:type", String)
], SwitchRoleDto.prototype, "role", void 0);
//# sourceMappingURL=update-user.dto.js.map