import { PrismaService } from '@/prisma/prisma.service'
import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'

const USER_SELECT = { id: true, name: true, avatar: true } as const

@Injectable()
export class ChatService {
	constructor(private prisma: PrismaService) {}

	// ── Conversations ──────────────────────────────────────────────────────────

	/**
	 * Find existing conversation between two users or create one.
	 * userAId is always the lexicographically smaller id to ensure uniqueness.
	 */
	async findOrCreateConversation(userIdA: string, userIdB: string) {
		const [a, b] = [userIdA, userIdB].sort()
		const existing = await this.prisma.conversation.findUnique({
			where: { userAId_userBId: { userAId: a, userBId: b } },
			include: {
				userA: { select: USER_SELECT },
				userB: { select: USER_SELECT },
			},
		})
		if (existing) return existing

		return this.prisma.conversation.create({
			data: { userAId: a, userBId: b },
			include: {
				userA: { select: USER_SELECT },
				userB: { select: USER_SELECT },
			},
		})
	}

	/** List all conversations for a user, sorted by latest activity */
	async getConversations(userId: string) {
		const conversations = await this.prisma.conversation.findMany({
			where: { OR: [{ userAId: userId }, { userBId: userId }] },
			include: {
				userA: { select: USER_SELECT },
				userB: { select: USER_SELECT },
				messages: {
					orderBy: { createdAt: 'desc' },
					take: 1,
					select: {
						content: true,
						createdAt: true,
						senderId: true,
						attachmentName: true,
						attachmentType: true,
					},
				},
			},
			orderBy: { updatedAt: 'desc' },
		})

		return conversations.map(conv => ({
			id: conv.id,
			partner: conv.userAId === userId ? conv.userB : conv.userA,
			lastMessage: conv.messages[0] ?? null,
			updatedAt: conv.updatedAt,
		}))
	}

	/** Validate that userId is a participant of the conversation */
	async assertParticipant(conversationId: string, userId: string) {
		const conv = await this.prisma.conversation.findUnique({
			where: { id: conversationId },
			select: { userAId: true, userBId: true },
		})
		if (!conv) throw new NotFoundException('Переписка не найдена')
		if (conv.userAId !== userId && conv.userBId !== userId) {
			throw new ForbiddenException('Нет доступа к этой переписке')
		}
		return conv
	}

	// ── Messages ──────────────────────────────────────────────────────────────

	/** Save a direct message and return it with sender info */
	async saveMessage(
		conversationId: string,
		senderId: string,
		content?: string | null,
		attachment?: {
			url: string
			name?: string | null
			type?: string | null
			size?: number | null
		},
	) {
		const [msg] = await this.prisma.$transaction([
			this.prisma.directMessage.create({
				data: {
					conversationId,
					senderId,
					content: content?.trim() || null,
					attachmentUrl: attachment?.url,
					attachmentName: attachment?.name ?? null,
					attachmentType: attachment?.type ?? null,
					attachmentSize: attachment?.size ?? null,
				},
				include: { sender: { select: USER_SELECT } },
			}),
			this.prisma.conversation.update({
				where: { id: conversationId },
				data: { updatedAt: new Date() },
			}),
		])
		return msg
	}

	/** Paginated message history (oldest first) */
	async getMessages(conversationId: string, page = 1, limit = 50) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.directMessage.findMany({
				where: { conversationId },
				include: { sender: { select: USER_SELECT } },
				orderBy: { createdAt: 'asc' },
				skip,
				take: limit,
			}),
			this.prisma.directMessage.count({ where: { conversationId } }),
		])
		return { data, total, page, limit }
	}

	/** Mark all messages in a conversation not sent by userId as read */
	async markAsRead(conversationId: string, userId: string) {
		await this.prisma.directMessage.updateMany({
			where: {
				conversationId,
				senderId: { not: userId },
				isRead: false,
			},
			data: { isRead: true },
		})
	}

	/** Count unread messages per conversationId for a user */
	async getUnreadCounts(userId: string): Promise<Record<string, number>> {
		const convIds = (
			await this.prisma.conversation.findMany({
				where: { OR: [{ userAId: userId }, { userBId: userId }] },
				select: { id: true },
			})
		).map(c => c.id)

		if (convIds.length === 0) return {}

		const rows = await this.prisma.directMessage.groupBy({
			by: ['conversationId'],
			where: {
				conversationId: { in: convIds },
				isRead: false,
				senderId: { not: userId },
			},
			_count: { id: true },
		})
		return Object.fromEntries(rows.map(r => [r.conversationId, r._count.id]))
	}
}
