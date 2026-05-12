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
exports.GetMessagesDto = exports.CreateConversationDto = exports.SendMessageDto = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class SendMessageDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { content: { required: true, type: () => String, maxLength: 2000 } };
    }
}
exports.SendMessageDto = SendMessageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Сообщение не может быть пустым' }),
    (0, class_validator_1.MaxLength)(2000, { message: 'Сообщение не может превышать 2000 символов' }),
    __metadata("design:type", String)
], SendMessageDto.prototype, "content", void 0);
class CreateConversationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { partnerId: { required: true, type: () => String } };
    }
}
exports.CreateConversationDto = CreateConversationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'partnerId обязателен' }),
    __metadata("design:type", String)
], CreateConversationDto.prototype, "partnerId", void 0);
class GetMessagesDto {
    constructor() {
        this.page = 1;
        this.limit = 50;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { page: { required: false, type: () => Number, default: 1, minimum: 1 }, limit: { required: false, type: () => Number, default: 50, minimum: 1 } };
    }
}
exports.GetMessagesDto = GetMessagesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetMessagesDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], GetMessagesDto.prototype, "limit", void 0);
//# sourceMappingURL=chat.dto.js.map