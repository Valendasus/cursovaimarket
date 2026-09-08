import { BadRequestException } from '@nestjs/common'
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
		emailVerified?: boolean
		presenceSubscriptions?: Set<string>
	}
}

/**
 * WebSocket CORS — mirrors the HTTP CORS policy in main.ts:
 * dev allows any localhost port, prod restricts to CORS_ORIGIN.
 */
const wsCorsOrigin = (
	origin: string | undefined,
	callback: (error: Error | null, allow?: boolean) => void,
) => {
	const isProd = process.env.NODE_ENV === 'production'
	const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

	// Allow non-browser clients (no Origin header)
	if (!origin) return callback(null, true)
	if (!isProd && /^http:\/\/localhost:\d+$/.test(origin)) {
		return callback(null, true)
	}
	if (corsOrigin === '*' || origin === corsOrigin) {
		return callback(null, true)
	}
	return callback(new Error('Not allowed by CORS'))
}

@WebSocketGateway({
	cors: {
		origin: wsCorsOrigin,
		credentials: true,
	},
	namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Server
	private readonly eventRateMap = new Map<string, number[]>()
	private readonly userConnections = new Map<string, number>()
	private readonly userLastSeen = new Map<string, number>()
	private readonly onlineState = new Map<string, boolean>()
	private readonly presenceSubscribers = new Map<string, Set<string>>()
	private readonly onlineTtlMs = 60_000

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
			// Cache verification state for this connection; refreshed on reconnect
			// (the client re-opens the socket when its token is refreshed).
			client.data.emailVerified = await this.chatService.isEmailVerified(
				payload.sub,
			)
			await client.join(`user:${client.data.userId}`)
			const nextCount = (this.userConnections.get(client.data.userId) ?? 0) + 1
			this.userConnections.set(client.data.userId, nextCount)
			this.touchUser(client.data.userId)
			this.emitPresenceUpdate(client.data.userId)
		} catch {
			client.emit('error', { message: 'Недействительный токен' })
			client.disconnect()
		}
	}

	handleDisconnect(client: AuthenticatedSocket) {
		if (client.data?.userId) {
			const nextCount = Math.max(
				0,
				(this.userConnections.get(client.data.userId) ?? 1) - 1,
			)
			this.userConnections.set(client.data.userId, nextCount)
			this.touchUser(client.data.userId)
			setTimeout(() => {
				this.emitPresenceUpdate(client.data.userId)
			}, this.onlineTtlMs + 1000)
		}
		this.removePresenceSubscriptions(client)
		for (const key of this.eventRateMap.keys()) {
			if (
				key.startsWith(`${client.id}:`) ||
				key.startsWith(`${client.data.userId}:`)
			) {
				this.eventRateMap.delete(key)
			}
		}
	}

	private checkRateLimit(
		clientId: string,
		userId: string | undefined,
		event: 'sendMessage' | 'markRead' | 'typing',
		limit: number,
		windowMs: number,
		scope?: string,
	) {
		const now = Date.now()
		const key = `${userId ?? clientId}:${event}:${scope ?? 'global'}`
		const timestamps = this.eventRateMap.get(key) ?? []
		const recent = timestamps.filter(timestamp => now - timestamp < windowMs)

		if (recent.length >= limit) {
			throw new WsException('Слишком много запросов, попробуйте чуть позже')
		}

		recent.push(now)
		this.eventRateMap.set(key, recent)
	}

	private touchUser(userId: string) {
		this.userLastSeen.set(userId, Date.now())
	}

	private isUserOnline(userId: string) {
		const lastSeen = this.userLastSeen.get(userId) ?? 0
		const count = this.userConnections.get(userId) ?? 0
		return count > 0 && Date.now() - lastSeen < this.onlineTtlMs
	}

	private emitPresenceUpdate(userId: string) {
		const online = this.isUserOnline(userId)
		const prev = this.onlineState.get(userId)
		if (prev === online) return
		this.onlineState.set(userId, online)
		const subscribers = this.presenceSubscribers.get(userId)
		if (!subscribers?.size) return
		subscribers.forEach(socketId => {
			this.server.to(socketId).emit('presenceUpdate', { userId, online })
		})
	}

	private emitPresenceSnapshot(client: AuthenticatedSocket, userId: string) {
		client.emit('presenceSnapshot', {
			userId,
			online: this.isUserOnline(userId),
		})
	}

	public emitNewMessage(
		conversationId: string,
		userAId: string,
		userBId: string,
		payload: unknown,
	) {
		this.server.to(`chat:${conversationId}`).emit('newMessage', payload)
		this.server.to(`user:${userAId}`).emit('newMessage', payload)
		this.server.to(`user:${userBId}`).emit('newMessage', payload)
	}

	private removePresenceSubscriptions(client: AuthenticatedSocket) {
		const subs = client.data?.presenceSubscriptions
		if (!subs?.size) return
		subs.forEach(userId => {
			const set = this.presenceSubscribers.get(userId)
			if (!set) return
			set.delete(client.id)
			if (!set.size) this.presenceSubscribers.delete(userId)
		})
		client.data.presenceSubscriptions = new Set()
	}

	@SubscribeMessage('subscribePresence')
	async handleSubscribePresence(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { userIds?: string[] },
	) {
		const ids = (data?.userIds ?? []).filter(Boolean)
		this.removePresenceSubscriptions(client)
		if (!ids.length) return

		const allowed = await Promise.all(
			ids.map(async userId => {
				const ok = await this.chatService.hasConversation(
					client.data.userId,
					userId,
				)
				return ok ? userId : null
			}),
		)
		const allowedIds = allowed.filter(Boolean) as string[]

		client.data.presenceSubscriptions = new Set()
		allowedIds.forEach(userId => {
			let set = this.presenceSubscribers.get(userId)
			if (!set) {
				set = new Set()
				this.presenceSubscribers.set(userId, set)
			}
			set.add(client.id)
			client.data.presenceSubscriptions?.add(userId)
			this.emitPresenceSnapshot(client, userId)
		})
	}

	@SubscribeMessage('presencePing')
	handlePresencePing(@ConnectedSocket() client: AuthenticatedSocket) {
		if (!client.data?.userId) return
		this.touchUser(client.data.userId)
		this.emitPresenceUpdate(client.data.userId)
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
		// Историю грузит клиент по HTTP (полностью, с пагинацией). Дублировать
		// её ещё и через сокет незачем — joinRoom нужен только для входа в
		// комнату и отметки прочитанного.
	}

	/** Client sends a new message */
	@SubscribeMessage('sendMessage')
	async handleSendMessage(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody()
		data: {
			conversationId: string
			clientMessageId?: string
			content?: string
			attachmentUrl?: string
			attachmentName?: string
			attachmentType?: string
			attachmentSize?: number
		},
	) {
		const { conversationId, content } = data
		const clientMessageId = data.clientMessageId ?? null
		try {
			const sendLimit = Number(process.env.CHAT_SEND_LIMIT ?? 20)
			const sendWindowMs = Number(process.env.CHAT_SEND_WINDOW_MS ?? 10_000)
			this.checkRateLimit(
				client.id,
				client.data.userId,
				'sendMessage',
				sendLimit,
				sendWindowMs,
				conversationId,
			)

			if (!conversationId) throw new WsException('conversationId обязателен')
			// Re-check from DB only for the unverified (cheap, rare): this lets a
			// freshly-verified user send without reconnecting the socket.
			if (client.data.emailVerified === false) {
				client.data.emailVerified = await this.chatService.isEmailVerified(
					client.data.userId,
				)
			}
			if (client.data.emailVerified === false) {
				throw new WsException(
					'Подтвердите email, чтобы отправлять сообщения',
				)
			}
			const hasText = Boolean(content?.trim())
			const hasAttachment = Boolean(data.attachmentUrl)
			if (!hasText && !hasAttachment) {
				throw new WsException('Сообщение не может быть пустым')
			}
			if (content && content.length > 2000)
				throw new WsException('Сообщение не может превышать 2000 символов')

			let conv: { userAId: string; userBId: string }
			try {
				conv = await this.chatService.assertParticipant(
					conversationId,
					client.data.userId,
				)
			} catch {
				throw new WsException('Нет доступа к этой переписке')
			}

			const message = await this.chatService.saveMessage(
				conversationId,
				client.data.userId,
				content,
				data.attachmentUrl
					? {
							url: data.attachmentUrl,
							name: data.attachmentName,
							type: data.attachmentType,
							size: data.attachmentSize,
						}
					: undefined,
			)
			const messagePayload = {
				...message,
				clientMessageId,
			}

			this.emitNewMessage(
				conversationId,
				conv.userAId,
				conv.userBId,
				messagePayload,
			)
			this.server.to(`user:${client.data.userId}`).emit('messageAck', {
				clientMessageId,
				status: 'sent',
				messageId: message.id,
			})
		} catch (err: unknown) {
			if (clientMessageId) {
				this.server.to(`user:${client.data.userId}`).emit('messageAck', {
					clientMessageId,
					status: 'failed',
				})
			}
			const message =
				err instanceof Error ? err.message : 'Ошибка при отправке сообщения'
			client.emit('error', { message })
			if (err instanceof WsException || err instanceof BadRequestException) {
				return
			}
			throw err
		}
	}

	/** Client marks messages as read */
	@SubscribeMessage('markRead')
	async handleMarkRead(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { conversationId: string },
	) {
		const { conversationId } = data
		this.checkRateLimit(
			client.id,
			client.data.userId,
			'markRead',
			60,
			10_000,
			conversationId,
		)
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

	/** Client typing indicator */
	@SubscribeMessage('typing')
	async handleTyping(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { conversationId: string; isTyping?: boolean },
	) {
		const { conversationId } = data
		this.checkRateLimit(
			client.id,
			client.data.userId,
			'typing',
			120,
			10_000,
			conversationId,
		)
		if (!conversationId) return

		let conv: { userAId: string; userBId: string }
		try {
			conv = await this.chatService.assertParticipant(
				conversationId,
				client.data.userId,
			)
		} catch {
			return
		}

		const targetUserId =
			conv.userAId === client.data.userId ? conv.userBId : conv.userAId
		const payload = {
			conversationId,
			fromUserId: client.data.userId,
			isTyping: Boolean(data.isTyping),
		}

		client.to(`chat:${conversationId}`).emit('typing', payload)
		this.server.to(`user:${targetUserId}`).emit('typing', payload)
	}
}
