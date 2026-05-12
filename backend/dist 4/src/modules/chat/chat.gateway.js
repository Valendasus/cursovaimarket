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
exports.ChatGateway = void 0;
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const chat_service_1 = require("./chat.service");
let ChatGateway = class ChatGateway {
    constructor(chatService, jwtService) {
        this.chatService = chatService;
        this.jwtService = jwtService;
        this.eventRateMap = new Map();
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '') ||
                client.handshake.query?.token;
            if (!token) {
                client.emit('error', { message: 'Требуется авторизация' });
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.data.userId = payload.sub;
            client.data.userName = payload.name ?? 'Пользователь';
        }
        catch {
            client.emit('error', { message: 'Недействительный токен' });
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        for (const key of this.eventRateMap.keys()) {
            if (key.startsWith(`${client.id}:`)) {
                this.eventRateMap.delete(key);
            }
        }
    }
    checkRateLimit(clientId, event, limit, windowMs) {
        const now = Date.now();
        const key = `${clientId}:${event}`;
        const timestamps = this.eventRateMap.get(key) ?? [];
        const recent = timestamps.filter(timestamp => now - timestamp < windowMs);
        if (recent.length >= limit) {
            throw new websockets_1.WsException('Слишком много запросов, попробуйте чуть позже');
        }
        recent.push(now);
        this.eventRateMap.set(key, recent);
    }
    async handleJoinRoom(client, data) {
        const { conversationId } = data;
        if (!conversationId)
            throw new websockets_1.WsException('conversationId обязателен');
        try {
            await this.chatService.assertParticipant(conversationId, client.data.userId);
        }
        catch {
            throw new websockets_1.WsException('Нет доступа к этой переписке');
        }
        for (const room of client.rooms) {
            if (room !== client.id && room.startsWith('chat:')) {
                await client.leave(room);
            }
        }
        await client.join(`chat:${conversationId}`);
        await this.chatService.markAsRead(conversationId, client.data.userId);
        const history = await this.chatService.getMessages(conversationId, 1, 50);
        client.emit('history', history);
    }
    async handleSendMessage(client, data) {
        this.checkRateLimit(client.id, 'sendMessage', 20, 10_000);
        const { conversationId, content } = data;
        if (!conversationId)
            throw new websockets_1.WsException('conversationId обязателен');
        if (!content?.trim())
            throw new websockets_1.WsException('Сообщение не может быть пустым');
        if (content.length > 2000)
            throw new websockets_1.WsException('Сообщение не может превышать 2000 символов');
        try {
            await this.chatService.assertParticipant(conversationId, client.data.userId);
        }
        catch {
            throw new websockets_1.WsException('Нет доступа к этой переписке');
        }
        const message = await this.chatService.saveMessage(conversationId, client.data.userId, content.trim());
        this.server.to(`chat:${conversationId}`).emit('newMessage', message);
    }
    async handleMarkRead(client, data) {
        this.checkRateLimit(client.id, 'markRead', 60, 10_000);
        const { conversationId } = data;
        if (!conversationId)
            return;
        try {
            await this.chatService.assertParticipant(conversationId, client.data.userId);
            await this.chatService.markAsRead(conversationId, client.data.userId);
            client.to(`chat:${conversationId}`).emit('messagesRead', {
                conversationId,
                byUserId: client.data.userId,
            });
        }
        catch {
        }
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('markRead'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkRead", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: true,
            credentials: true,
        },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map