import { clampPagination } from '@/common/pagination'
import { S3Service } from '@/common/s3/s3.service'
import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'

const USER_SELECT = { id: true, name: true, avatar: true } as const

@Injectable()
export class ChatService {
	constructor(
		private prisma: PrismaService,
		private s3Service: S3Service,
	) {}

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

		const mapped = await Promise.all(
			conversations.map(async conv => ({
				id: conv.id,
				partner: await this.withSignedAvatar(
					conv.userAId === userId ? conv.userB : conv.userA,
				),
				lastMessage: conv.messages[0] ?? null,
				updatedAt: conv.updatedAt,
			})),
		)

		return mapped
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

	/** Whether the user has a verified email (gates sending messages) */
	async isEmailVerified(userId: string): Promise<boolean> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { emailVerified: true },
		})
		return Boolean(user?.emailVerified)
	}

	/** Check if two users have a conversation */
	async hasConversation(userId: string, otherUserId: string) {
		if (userId === otherUserId) return true
		const [a, b] = [userId, otherUserId].sort()
		const conv = await this.prisma.conversation.findUnique({
			where: { userAId_userBId: { userAId: a, userBId: b } },
			select: { id: true },
		})
		return Boolean(conv)
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
		let normalizedAttachment: string | null = null
		if (attachment?.url) {
			const normalized = this.s3Service.normalizeRef(attachment.url)
			if (!normalized || !this.s3Service.isS3Ref(normalized)) {
				throw new BadRequestException('Недопустимый файл вложения')
			}
			normalizedAttachment = normalized
		}
		const [msg] = await this.prisma.$transaction([
			this.prisma.directMessage.create({
				data: {
					conversationId,
					senderId,
					content: content?.trim() || null,
					attachmentUrl: normalizedAttachment ?? null,
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
		return this.withSignedMessage(msg)
	}

	/** Paginated message history (oldest first) */
	async getMessages(conversationId: string, rawPage = 1, rawLimit = 50) {
		const { page, limit, skip } = clampPagination(rawPage, rawLimit, {
			defaultLimit: 50,
			maxLimit: 100,
		})
		const [data, total] = await Promise.all([
			this.prisma.directMessage.findMany({
				where: { conversationId },
				include: { sender: { select: USER_SELECT } },
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit,
			}),
			this.prisma.directMessage.count({ where: { conversationId } }),
		])
		const signed = await Promise.all(
			data.reverse().map(msg => this.withSignedMessage(msg)),
		)
		return { data: signed, total, page, limit }
	}

	private async withSignedMessage<
		T extends {
			attachmentUrl?: string | null
			sender?: { avatar?: string | null }
		},
	>(message: T): Promise<T> {
		const signedAttachment = await this.s3Service.signUrl(
			message.attachmentUrl ?? undefined,
		)
		const signedSender = await this.withSignedAvatar(message.sender)
		return {
			...message,
			attachmentUrl: signedAttachment ?? null,
			sender: signedSender,
		}
	}

	private async withSignedAvatar<T extends { avatar?: string | null }>(
		user?: T,
	): Promise<T | undefined> {
		if (!user) return user
		const avatar = await this.s3Service.signUrl(user.avatar ?? undefined)
		return { ...user, avatar: avatar ?? null }
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
