import { PrismaService } from '@/prisma/prisma.service'
import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'

@Injectable()
export class ChatService {
	constructor(private prisma: PrismaService) {}

	/** Validate that userId is either the student or freelancer of the order */
	async assertParticipant(orderId: string, userId: string) {
		const order = await this.prisma.order.findUnique({
			where: { id: orderId },
			select: { studentId: true, freelancerId: true },
		})
		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== userId && order.freelancerId !== userId) {
			throw new ForbiddenException('Нет доступа к чату этого заказа')
		}
		return order
	}

	/** Save message to DB and return it with sender info */
	async saveMessage(orderId: string, senderId: string, content: string) {
		return this.prisma.chatMessage.create({
			data: { orderId, senderId, content },
			include: {
				sender: { select: { id: true, name: true, avatar: true } },
			},
		})
	}

	/** Get paginated messages for an order (oldest first for rendering) */
	async getMessages(orderId: string, page = 1, limit = 50) {
		const skip = (page - 1) * limit
		const [data, total] = await Promise.all([
			this.prisma.chatMessage.findMany({
				where: { orderId },
				include: {
					sender: { select: { id: true, name: true, avatar: true } },
				},
				orderBy: { createdAt: 'asc' },
				skip,
				take: limit,
			}),
			this.prisma.chatMessage.count({ where: { orderId } }),
		])
		return { data, total, page, limit }
	}

	/** Mark all messages in this order NOT sent by userId as read */
	async markAsRead(orderId: string, userId: string) {
		await this.prisma.chatMessage.updateMany({
			where: {
				orderId,
				senderId: { not: userId },
				isRead: false,
			},
			data: { isRead: true },
		})
	}

	/** Count unread messages for a user across all their orders */
	async getUnreadCounts(userId: string): Promise<Record<string, number>> {
		const rows = await this.prisma.chatMessage.groupBy({
			by: ['orderId'],
			where: {
				isRead: false,
				senderId: { not: userId },
				order: {
					OR: [{ studentId: userId }, { freelancerId: userId }],
				},
			},
			_count: { id: true },
		})
		return Object.fromEntries(rows.map(r => [r.orderId, r._count.id]))
	}
}
