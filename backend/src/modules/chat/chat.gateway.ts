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
		origin: true, // mirrors request origin — required when credentials:true
		credentials: true,
	},
	namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server

	constructor(
		private chatService: ChatService,
		private jwtService: JwtService,
	) {}

	// ── Connection lifecycle ──────────────────────────────────────────────────

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
		// Socket.IO automatically removes client from all rooms on disconnect
		void client
	}

	// ── Events ────────────────────────────────────────────────────────────────

	/** Client joins an order's chat room and receives message history */
	@SubscribeMessage('joinRoom')
	async handleJoinRoom(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { orderId: string },
	) {
		const { orderId } = data
		if (!orderId) throw new WsException('orderId обязателен')

		try {
			await this.chatService.assertParticipant(orderId, client.data.userId)
		} catch {
			throw new WsException('Нет доступа к чату этого заказа')
		}

		// Leave any previously joined rooms (except own socket room)
		for (const room of client.rooms) {
			if (room !== client.id && room.startsWith('chat:')) {
				await client.leave(room)
			}
		}

		await client.join(`chat:${orderId}`)

		// Mark messages as read on join
		await this.chatService.markAsRead(orderId, client.data.userId)

		// Send message history
		const history = await this.chatService.getMessages(orderId, 1, 50)
		client.emit('history', history)
	}

	/** Client sends a new message */
	@SubscribeMessage('sendMessage')
	async handleSendMessage(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { orderId: string; content: string },
	) {
		const { orderId, content } = data

		if (!orderId) throw new WsException('orderId обязателен')
		if (!content?.trim())
			throw new WsException('Сообщение не может быть пустым')
		if (content.length > 2000)
			throw new WsException('Сообщение не может превышать 2000 символов')

		try {
			await this.chatService.assertParticipant(orderId, client.data.userId)
		} catch {
			throw new WsException('Нет доступа к чату этого заказа')
		}

		const message = await this.chatService.saveMessage(
			orderId,
			client.data.userId,
			content.trim(),
		)

		// Broadcast to everyone in the room (including sender)
		this.server.to(`chat:${orderId}`).emit('newMessage', message)
	}

	/** Client notifies they've read messages */
	@SubscribeMessage('markRead')
	async handleMarkRead(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { orderId: string },
	) {
		const { orderId } = data
		if (!orderId) return

		try {
			await this.chatService.assertParticipant(orderId, client.data.userId)
			await this.chatService.markAsRead(orderId, client.data.userId)

			// Notify others in the room that messages were read
			client.to(`chat:${orderId}`).emit('messagesRead', {
				orderId,
				byUserId: client.data.userId,
			})
		} catch {
			// silently ignore
		}
	}
}
