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
exports.LoginDto = exports.RegisterDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class RegisterDto {
    constructor() {
        this.role = client_1.UserRole.STUDENT;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, minLength: 2, maxLength: 50, pattern: "/^[\\u0400-\\u04ffa-zA-Z0-9_\\-\\s]+$/" }, email: { required: true, type: () => String, format: "email" }, password: { required: true, type: () => String, minLength: 8, maxLength: 72 }, role: { required: true, type: () => Object, default: client_1.UserRole.STUDENT } };
    }
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'ivan_ivanov',
        description: 'Никнейм пользователя',
        minLength: 2,
        maxLength: 50,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2, { message: 'Имя минимум 2 символа' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Имя максимум 50 символов' }),
    (0, class_validator_1.Matches)(/^[\u0400-\u04ffa-zA-Z0-9_\-\s]+$/, {
        message: 'Имя содержит недопустимые символы',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ivan@example.com' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Введите корректный email' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'password123', minLength: 8, maxLength: 72 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Пароль минимум 8 символов' }),
    (0, class_validator_1.MaxLength)(72, { message: 'Пароль максимум 72 символа' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.UserRole, default: client_1.UserRole.STUDENT }),
    (0, class_validator_1.IsEnum)(client_1.UserRole),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
class LoginDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { email: { required: true, type: () => String, format: "email" }, password: { required: true, type: () => String } };
    }
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ivan@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'password123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
//# sourceMappingURL=auth.dto.js.map