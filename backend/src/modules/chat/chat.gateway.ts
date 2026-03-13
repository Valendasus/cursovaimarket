import { JwtService } from '@nestjs/jwt'
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'

interface AuthenticatedSocket extends Socket {
	data: {
		userId: string
		userName: string
	}
}

@WebSocketGateway({
	cors: {
		origin: true,
		credentials: true,
	},
	namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server
	private readonly eventRateMap = new Map<string, number[]>()

	constructor(
		private chatService: ChatService,
		private jwtService: JwtService,
	) {}

	async handleConnection(client: AuthenticatedSocket) {
		try {
			const token =
				client.handshake.auth?.token ||
				client.handshake.headers?.authorization?.replace('Bearer ', '') ||
				(client.handshake.query?.token as string)

			if (!token) {
				client.emit('error', { message: 'Требуется авторизация' })
				client.disconnect()
				return
			}

			const payload = this.jwtService.verify<{ sub: string; name?: string }>(
				token,
			)
			client.data.userId = payload.sub
			client.data.userName = payload.name ?? 'Пользователь'
		} catch {
			client.emit('error', { message: 'Недействительный токен' })
			client.disconnect()
		}
	}

	handleDisconnect(client: AuthenticatedSocket) {
		for (const key of this.eventRateMap.keys()) {
			if (key.startsWith(`${client.id}:`)) {
				this.eventRateMap.delete(key)
			}
		}
	}

	private checkRateLimit(
		clientId: string,
		event: 'sendMessage' | 'markRead',
		limit: number,
		windowMs: number,
	) {
		const now = Date.now()
		const key = `${clientId}:${event}`
		const timestamps = this.eventRateMap.get(key) ?? []
		const recent = timestamps.filter(timestamp => now - timestamp < windowMs)

		if (recent.length >= limit) {
			throw new WsException('Слишком много запросов, попробуйте чуть позже')
		}

		recent.push(now)
		this.eventRateMap.set(key, recent)
	}

	/** Client joins a conversation room and receives message history */
	@SubscribeMessage('joinRoom')
	async handleJoinRoom(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { conversationId: string },
	) {
		const { conversationId } = data
		if (!conversationId) throw new WsException('conversationId обязателен')

		try {
			await this.chatService.assertParticipant(
				conversationId,
				client.data.userId,
			)
		} catch {
			throw new WsException('Нет доступа к этой переписке')
		}

		for (const room of client.rooms) {
			if (room !== client.id && room.startsWith('chat:')) {
				await client.leave(room)
			}
		}

		await client.join(`chat:${conversationId}`)
		await this.chatService.markAsRead(conversationId, client.data.userId)

		const history = await this.chatService.getMessages(conversationId, 1, 50)
		client.emit('history', history)
	}

	/** Client sends a new message */
	@SubscribeMessage('sendMessage')
	async handleSendMessage(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { conversationId: string; content: string },
	) {
		this.checkRateLimit(client.id, 'sendMessage', 20, 10_000)

		const { conversationId, content } = data

		if (!conversationId) throw new WsException('conversationId обязателен')
		if (!content?.trim())
			throw new WsException('Сообщение не может быть пустым')
		if (content.length > 2000)
			throw new WsException('Сообщение не может превышать 2000 символов')

		try {
			await this.chatService.assertParticipant(
				conversationId,
				client.data.userId,
			)
		} catch {
			throw new WsException('Нет доступа к этой переписке')
		}

		const message = await this.chatService.saveMessage(
			conversationId,
			client.data.userId,
			content.trim(),
		)

		this.server.to(`chat:${conversationId}`).emit('newMessage', message)
	}

	/** Client marks messages as read */
	@SubscribeMessage('markRead')
	async handleMarkRead(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { conversationId: string },
	) {
		this.checkRateLimit(client.id, 'markRead', 60, 10_000)

		const { conversationId } = data
		if (!conversationId) return

		try {
			await this.chatService.assertParticipant(
				conversationId,
				client.data.userId,
			)
			await this.chatService.markAsRead(conversationId, client.data.userId)

			client.to(`chat:${conversationId}`).emit('messagesRead', {
				conversationId,
				byUserId: client.data.userId,
			})
		} catch {
			// silently ignore
		}
	}
}
