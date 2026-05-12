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
exports.ChatService = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const USER_SELECT = { id: true, name: true, avatar: true };
let ChatService = class ChatService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOrCreateConversation(userIdA, userIdB) {
        const [a, b] = [userIdA, userIdB].sort();
        const existing = await this.prisma.conversation.findUnique({
            where: { userAId_userBId: { userAId: a, userBId: b } },
            include: {
                userA: { select: USER_SELECT },
                userB: { select: USER_SELECT },
            },
        });
        if (existing)
            return existing;
        return this.prisma.conversation.create({
            data: { userAId: a, userBId: b },
            include: {
                userA: { select: USER_SELECT },
                userB: { select: USER_SELECT },
            },
        });
    }
    async getConversations(userId) {
        const conversations = await this.prisma.conversation.findMany({
            where: { OR: [{ userAId: userId }, { userBId: userId }] },
            include: {
                userA: { select: USER_SELECT },
                userB: { select: USER_SELECT },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { content: true, createdAt: true, senderId: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        return conversations.map(conv => ({
            id: conv.id,
            partner: conv.userAId === userId ? conv.userB : conv.userA,
            lastMessage: conv.messages[0] ?? null,
            updatedAt: conv.updatedAt,
        }));
    }
    async assertParticipant(conversationId, userId) {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userAId: true, userBId: true },
        });
        if (!conv)
            throw new common_1.NotFoundException('Переписка не найдена');
        if (conv.userAId !== userId && conv.userBId !== userId) {
            throw new common_1.ForbiddenException('Нет доступа к этой переписке');
        }
        return conv;
    }
    async saveMessage(conversationId, senderId, content) {
        const [msg] = await this.prisma.$transaction([
            this.prisma.directMessage.create({
                data: { conversationId, senderId, content },
                include: { sender: { select: USER_SELECT } },
            }),
            this.prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            }),
        ]);
        return msg;
    }
    async getMessages(conversationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.directMessage.findMany({
                where: { conversationId },
                include: { sender: { select: USER_SELECT } },
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.directMessage.count({ where: { conversationId } }),
        ]);
        return { data, total, page, limit };
    }
    async markAsRead(conversationId, userId) {
        await this.prisma.directMessage.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true },
        });
    }
    async getUnreadCounts(userId) {
        const convIds = (await this.prisma.conversation.findMany({
            where: { OR: [{ userAId: userId }, { userBId: userId }] },
            select: { id: true },
        })).map(c => c.id);
        if (convIds.length === 0)
            return {};
        const rows = await this.prisma.directMessage.groupBy({
            by: ['conversationId'],
            where: {
                conversationId: { in: convIds },
                isRead: false,
                senderId: { not: userId },
            },
            _count: { id: true },
        });
        return Object.fromEntries(rows.map(r => [r.conversationId, r._count.id]));
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map