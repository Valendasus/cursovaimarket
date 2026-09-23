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
import { getSocketLimits } from './socket-limits'

interface AuthenticatedSocket extends Socket {
	data: {
		userId: string
		userName: string
		emailVerified?: boolean
		presenceSubscriptions?: Map<string, Set<string>>
		connectionIp?: string
		connectionCounted?: boolean
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
	private readonly connectionAttempts = new Map<string, number[]>()
	private readonly userConnections = new Map<string, number>()
	private readonly ipConnections = new Map<string, number>()
	private readonly abuseEvents = new Map<string, number[]>()
	private readonly blockedUntil = new Map<string, number>()
	private lastStateCleanupAt = Date.now()
	private readonly userLastSeen = new Map<string, number>()
	private readonly onlineState = new Map<string, boolean>()
	private readonly presenceSubscribers = new Map<string, Set<string>>()
	private readonly onlineTtlMs = 60_000

	constructor(
		private chatService: ChatService,
		private jwtService: JwtService,
	) {}

	async handleConnection(client: AuthenticatedSocket) {
		const ip = this.getClientIp(client)
		client.data.connectionIp = ip
		if (this.isBlocked(`ip:${ip}`)) {
			this.rejectConnection(client, 'Подключение временно заблокировано')
			return
		}
		if (!this.allowReconnect(ip)) {
			this.registerAbuse(`ip:${ip}`)
			this.rejectConnection(client, 'Слишком много попыток переподключения')
			return
		}

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
			if (this.isBlocked(`user:${payload.sub}`)) {
				this.rejectConnection(client, 'Пользователь временно заблокирован')
				return
			}

			const limits = getSocketLimits()
			if (
				(this.userConnections.get(payload.sub) ?? 0) >=
				limits.maxConnectionsPerUser
			) {
				this.registerAbuse(`user:${payload.sub}`)
				this.rejectConnection(client, 'Превышен лимит подключений пользователя')
				return
			}
			if ((this.ipConnections.get(ip) ?? 0) >= limits.maxConnectionsPerIp) {
				this.registerAbuse(`ip:${ip}`)
				this.rejectConnection(client, 'Превышен лимит подключений с адреса')
				return
			}
			// Reserve both slots before the first await so parallel handshakes
			// cannot all pass the limit check.
			this.userConnections.set(
				payload.sub,
				(this.userConnections.get(payload.sub) ?? 0) + 1,
			)
			this.ipConnections.set(ip, (this.ipConnections.get(ip) ?? 0) + 1)
			client.data.connectionCounted = true
			// Cache verification state for this connection; refreshed on reconnect
			// (the client re-opens the socket when its token is refreshed).
			client.data.emailVerified = await this.chatService.isEmailVerified(
				payload.sub,
			)
			await client.join(`user:${client.data.userId}`)
			this.touchUser(client.data.userId)
			this.emitPresenceUpdate(client.data.userId)
		} catch {
			client.emit('error', { message: 'Недействительный токен' })
			client.disconnect()
		}
	}

	handleDisconnect(client: AuthenticatedSocket) {
		if (client.data?.userId && client.data.connectionCounted) {
			const nextCount = Math.max(
				0,
				(this.userConnections.get(client.data.userId) ?? 1) - 1,
			)
			if (nextCount) this.userConnections.set(client.data.userId, nextCount)
			else this.userConnections.delete(client.data.userId)
			this.touchUser(client.data.userId)
			setTimeout(() => {
				this.emitPresenceUpdate(client.data.userId)
			}, this.onlineTtlMs + 1000)
		}
		if (client.data?.connectionIp && client.data.connectionCounted) {
			const ip = client.data.connectionIp
			const nextCount = Math.max(0, (this.ipConnections.get(ip) ?? 1) - 1)
			if (nextCount) this.ipConnections.set(ip, nextCount)
			else this.ipConnections.delete(ip)
		}
		if (client.data) client.data.connectionCounted = false
		this.removePresenceSubscriptions(client)
		for (const key of this.eventRateMap.keys()) {
			// Authenticated limits deliberately survive reconnects. Otherwise a
			// client could reset its quota by opening a fresh socket.
			if (key.startsWith(`${client.id}:`)) this.eventRateMap.delete(key)
		}
	}

	private checkRateLimit(
		client: AuthenticatedSocket,
		event: string,
		limit: number,
		windowMs: number,
		scope?: string,
	) {
		const now = Date.now()
		this.maybeCleanupState(now)
		const key = `${client.data.userId ?? client.id}:${event}:${scope ?? 'global'}`
		const timestamps = this.eventRateMap.get(key) ?? []
		const recent = timestamps.filter((timestamp) => now - timestamp < windowMs)

		if (recent.length >= limit) {
			this.registerClientAbuse(client)
			throw new WsException('Слишком много запросов, попробуйте чуть позже')
		}

		recent.push(now)
		this.eventRateMap.set(key, recent)
	}

	private guardEvent(
		client: AuthenticatedSocket,
		event: string,
		data?: unknown,
	) {
		const limits = getSocketLimits()
		const ip = client.data.connectionIp ?? this.getClientIp(client)
		if (
			this.isBlocked(`user:${client.data.userId}`) ||
			this.isBlocked(`ip:${ip}`)
		) {
			client.disconnect(true)
			throw new WsException('Пользователь временно заблокирован')
		}

		let bytes: number
		try {
			bytes = Buffer.byteLength(JSON.stringify([event, data ?? null]), 'utf8')
		} catch {
			this.registerClientAbuse(client)
			throw new WsException('Некорректное событие')
		}
		if (bytes > limits.maxEventBytes) {
			this.registerClientAbuse(client)
			throw new WsException('Событие превышает допустимый размер')
		}

		this.checkRateLimit(
			client,
			'all',
			limits.messageLimit,
			limits.messageWindowMs,
		)
	}

	private getClientIp(client: AuthenticatedSocket): string {
		if (process.env.SOCKET_TRUST_PROXY === 'true') {
			const forwarded = client.handshake?.headers?.['x-forwarded-for']
			const first = Array.isArray(forwarded) ? forwarded[0] : forwarded
			if (first) return first.split(',')[0].trim()
		}
		return client.handshake?.address || client.conn?.remoteAddress || 'unknown'
	}

	private allowReconnect(ip: string): boolean {
		const limits = getSocketLimits()
		const now = Date.now()
		this.maybeCleanupState(now)
		const key = `ip:${ip}`
		const recent = (this.connectionAttempts.get(key) ?? []).filter(
			(timestamp) => now - timestamp < limits.reconnectWindowMs,
		)
		if (recent.length >= limits.reconnectLimit) {
			this.connectionAttempts.set(key, recent)
			return false
		}
		recent.push(now)
		this.connectionAttempts.set(key, recent)
		return true
	}

	private registerClientAbuse(client: AuthenticatedSocket) {
		// Prefer a user block for authenticated traffic, avoiding collateral
		// blocks for unrelated users behind the same NAT.
		const key = client.data.userId
			? `user:${client.data.userId}`
			: `ip:${client.data.connectionIp ?? this.getClientIp(client)}`
		const blocked = this.registerAbuse(key)
		if (blocked) client.disconnect(true)
	}

	private registerAbuse(key: string): boolean {
		const limits = getSocketLimits()
		const now = Date.now()
		this.maybeCleanupState(now)
		const recent = (this.abuseEvents.get(key) ?? []).filter(
			(timestamp) => now - timestamp < limits.abuseWindowMs,
		)
		recent.push(now)
		if (recent.length >= limits.abuseThreshold) {
			this.abuseEvents.delete(key)
			this.blockedUntil.set(key, now + limits.blockDurationMs)
			return true
		}
		this.abuseEvents.set(key, recent)
		return false
	}

	private isBlocked(key: string): boolean {
		const until = this.blockedUntil.get(key) ?? 0
		if (until > Date.now()) return true
		if (until) this.blockedUntil.delete(key)
		return false
	}

	private maybeCleanupState(now: number) {
		if (now - this.lastStateCleanupAt < 60_000) return
		this.lastStateCleanupAt = now
		const limits = getSocketLimits()
		const eventTtl = Math.max(
			limits.messageWindowMs,
			limits.chatSendWindowMs,
			10_000,
		)
		const prune = (map: Map<string, number[]>, ttl: number) => {
			for (const [key, timestamps] of map) {
				const recent = timestamps.filter((timestamp) => now - timestamp < ttl)
				if (recent.length) map.set(key, recent)
				else map.delete(key)
			}
		}
		prune(this.eventRateMap, eventTtl)
		prune(this.connectionAttempts, limits.reconnectWindowMs)
		prune(this.abuseEvents, limits.abuseWindowMs)
		for (const [key, until] of this.blockedUntil) {
			if (until <= now) this.blockedUntil.delete(key)
		}
	}

	private rejectConnection(client: AuthenticatedSocket, message: string) {
		client.emit('error', { message })
		client.disconnect(true)
	}

	private joinedRoomCount(client: AuthenticatedSocket): number {
		return Array.from(client.rooms).filter((room) => room !== client.id).length
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
		subscribers.forEach((socketId) => {
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
		const subscriptions = client.data?.presenceSubscriptions
		if (!subscriptions?.size) return
		const userIds = new Set(
			Array.from(subscriptions.values()).flatMap((ids) => Array.from(ids)),
		)
		userIds.forEach((userId) => {
			const set = this.presenceSubscribers.get(userId)
			if (!set) return
			set.delete(client.id)
			if (!set.size) this.presenceSubscribers.delete(userId)
		})
		client.data.presenceSubscriptions = new Map()
	}

	@SubscribeMessage('subscribePresence')
	async handleSubscribePresence(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody()
		data: { userIds?: string[]; scope?: 'list' | 'active' },
	) {
		this.guardEvent(client, 'subscribePresence', data)
		const ids = [...new Set((data?.userIds ?? []).filter(Boolean))]
		const scope = data?.scope === 'active' ? 'active' : 'list'

		const allowed = await Promise.all(
			ids.map(async (userId) => {
				const ok = await this.chatService.hasConversation(
					client.data.userId,
					userId,
				)
				return ok ? userId : null
			}),
		)
		const allowedIds = allowed.filter(Boolean) as string[]
		const subscriptions =
			client.data.presenceSubscriptions ?? new Map<string, Set<string>>()
		const previousUnion = new Set(
			Array.from(subscriptions.values()).flatMap((values) =>
				Array.from(values),
			),
		)
		subscriptions.set(scope, new Set(allowedIds))
		client.data.presenceSubscriptions = subscriptions
		const nextUnion = new Set(
			Array.from(subscriptions.values()).flatMap((values) =>
				Array.from(values),
			),
		)

		previousUnion.forEach((userId) => {
			if (nextUnion.has(userId)) return
			const set = this.presenceSubscribers.get(userId)
			if (!set) return
			set.delete(client.id)
			if (!set.size) this.presenceSubscribers.delete(userId)
		})
		nextUnion.forEach((userId) => {
			let set = this.presenceSubscribers.get(userId)
			if (!set) {
				set = new Set()
				this.presenceSubscribers.set(userId, set)
			}
			set.add(client.id)
			this.emitPresenceSnapshot(client, userId)
		})
	}

	@SubscribeMessage('presencePing')
	handlePresencePing(@ConnectedSocket() client: AuthenticatedSocket) {
		this.guardEvent(client, 'presencePing')
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
		this.guardEvent(client, 'joinRoom', data)
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
		if (this.joinedRoomCount(client) >= getSocketLimits().maxRooms) {
			this.registerClientAbuse(client)
			throw new WsException('Превышен лимит комнат')
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
			this.guardEvent(client, 'sendMessage', data)
			const limits = getSocketLimits()
			this.checkRateLimit(
				client,
				'sendMessage',
				limits.chatSendLimit,
				limits.chatSendWindowMs,
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
				throw new WsException('Подтвердите email, чтобы отправлять сообщения')
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
				clientMessageId,
			)

			this.emitNewMessage(conversationId, conv.userAId, conv.userBId, message)
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
		this.guardEvent(client, 'markRead', data)
		const { conversationId } = data
		this.checkRateLimit(client, 'markRead', 60, 10_000, conversationId)
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
		this.guardEvent(client, 'typing', data)
		const { conversationId } = data
		this.checkRateLimit(client, 'typing', 120, 10_000, conversationId)
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
