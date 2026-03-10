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

			const payload = this.jwtService.verify<{ sub: string; name?: string }>(token)
			client.data.userId = payload.sub
			client.data.userName = payload.name ?? 'Пользователь'
		} catch {
			client.emit('error', { message: 'Недействительный токен' })
			client.disconnect()
		}
	}

	handleDisconnect(client: AuthenticatedSocket) {
		void client
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
			await this.chatService.assertParticipant(conversationId, client.data.userId)
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
		const { conversationId, content } = data

		if (!conversationId) throw new WsException('conversationId обязателен')
		if (!content?.trim()) throw new WsException('Сообщение не может быть пустым')
		if (content.length > 2000) throw new WsException('Сообщение не может превышать 2000 символов')

		try {
			await this.chatService.assertParticipant(conversationId, client.data.userId)
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
		const { conversationId } = data
		if (!conversationId) return

		try {
			await this.chatService.assertParticipant(conversationId, client.data.userId)
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
