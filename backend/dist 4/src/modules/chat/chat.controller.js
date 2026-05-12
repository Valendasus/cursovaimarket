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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const openapi = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const chat_service_1 = require("./chat.service");
const chat_dto_1 = require("./dto/chat.dto");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    async getConversations(userId) {
        return this.chatService.getConversations(userId);
    }
    async findOrCreate(userId, body) {
        return this.chatService.findOrCreateConversation(userId, body.partnerId);
    }
    async getUnreadCounts(userId) {
        return this.chatService.getUnreadCounts(userId);
    }
    async getMessages(conversationId, userId, page, limit) {
        await this.chatService.assertParticipant(conversationId, userId);
        return this.chatService.getMessages(conversationId, page, limit);
    }
    async sendMessage(conversationId, userId, body) {
        await this.chatService.assertParticipant(conversationId, userId);
        return this.chatService.saveMessage(conversationId, userId, body.content.trim());
    }
    async markRead(conversationId, userId) {
        await this.chatService.assertParticipant(conversationId, userId);
        await this.chatService.markAsRead(conversationId, userId);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('conversations'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Список переписок текущего пользователя' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Post)('conversations'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Найти или создать переписку с пользователем' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, chat_dto_1.CreateConversationDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "findOrCreate", null);
__decorate([
    (0, common_1.Get)('unread/counts'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Количество непрочитанных сообщений по перепискам' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCounts", null);
__decorate([
    (0, common_1.Get)('conversations/:conversationId'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'История сообщений переписки' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('conversations/:conversationId'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Отправить сообщение (fallback)' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, chat_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Patch)('conversations/:conversationId/read'),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Отметить сообщения как прочитанные' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markRead", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map