import { WsException } from '@nestjs/websockets'
import { ChatGateway } from './chat.gateway'

function makeClient(overrides: Record<string, unknown> = {}) {
	const roomEmit = jest.fn()
	return {
		id: 'socket-1',
		data: { userId: 'user-1', userName: 'User', emailVerified: true },
		handshake: { auth: { token: 'token' }, headers: {}, query: {} },
		rooms: new Set(['socket-1', 'chat:old']),
		emit: jest.fn(),
		disconnect: jest.fn(),
		join: jest.fn().mockResolvedValue(undefined),
		leave: jest.fn().mockResolvedValue(undefined),
		to: jest.fn(() => ({ emit: roomEmit })),
		roomEmit,
		...overrides,
	}
}

function build() {
	const chatService = {
		isEmailVerified: jest.fn().mockResolvedValue(true),
		hasConversation: jest.fn().mockResolvedValue(true),
		assertParticipant: jest
			.fn()
			.mockResolvedValue({ userAId: 'user-1', userBId: 'user-2' }),
		markAsRead: jest.fn().mockResolvedValue(undefined),
		saveMessage: jest
			.fn()
			.mockResolvedValue({ id: 'message-1', content: 'hi' }),
	}
	const jwt = {
		verify: jest.fn().mockReturnValue({ sub: 'user-1', name: 'User' }),
	}
	const serverEmit = jest.fn()
	const server = { to: jest.fn(() => ({ emit: serverEmit })) }
	const gateway = new ChatGateway(chatService as never, jwt as never)
	gateway.server = server as never
	return { gateway, chatService, jwt, server, serverEmit }
}

describe('ChatGateway', () => {
	const originalEnv = { ...process.env }
	const socketEnvKeys = [
		'CHAT_SEND_LIMIT',
		'CHAT_SEND_WINDOW_MS',
		'SOCKET_MAX_CONNECTIONS_PER_USER',
		'SOCKET_MAX_CONNECTIONS_PER_IP',
		'SOCKET_TRUST_PROXY',
		'SOCKET_MESSAGE_LIMIT',
		'SOCKET_MESSAGE_WINDOW_MS',
		'SOCKET_MAX_EVENT_BYTES',
		'SOCKET_MAX_ROOMS',
		'SOCKET_RECONNECT_LIMIT',
		'SOCKET_RECONNECT_WINDOW_MS',
		'SOCKET_ABUSE_THRESHOLD',
		'SOCKET_ABUSE_WINDOW_MS',
		'SOCKET_BLOCK_DURATION_MS',
	]

	beforeEach(() => {
		jest.clearAllMocks()
		socketEnvKeys.forEach((key) => delete process.env[key])
	})

	afterAll(() => {
		process.env = originalEnv
	})

	it('rejects a connection without a token', async () => {
		const { gateway } = build()
		const client = makeClient({
			handshake: { auth: {}, headers: {}, query: {} },
		})

		await gateway.handleConnection(client as never)
		expect(client.emit).toHaveBeenCalledWith('error', {
			message: 'Требуется авторизация',
		})
		expect(client.disconnect).toHaveBeenCalled()
	})

	it('authenticates, joins a personal room and records presence', async () => {
		const { gateway, chatService, jwt } = build()
		const client = makeClient()

		await gateway.handleConnection(client as never)

		expect(jwt.verify).toHaveBeenCalledWith('token')
		expect(chatService.isEmailVerified).toHaveBeenCalledWith('user-1')
		expect(client.join).toHaveBeenCalledWith('user:user-1')
		expect(client.data).toMatchObject({
			userId: 'user-1',
			userName: 'User',
			emailVerified: true,
		})
	})

	it('limits concurrent connections per user', async () => {
		process.env.SOCKET_MAX_CONNECTIONS_PER_USER = '1'
		const { gateway } = build()
		const first = makeClient({ id: 'socket-1' })
		const second = makeClient({ id: 'socket-2' })

		await gateway.handleConnection(first as never)
		await gateway.handleConnection(second as never)

		expect(second.emit).toHaveBeenCalledWith('error', {
			message: 'Превышен лимит подключений пользователя',
		})
		expect(second.disconnect).toHaveBeenCalledWith(true)
	})

	it('protects against reconnect storms by IP', async () => {
		process.env.SOCKET_RECONNECT_LIMIT = '1'
		const { gateway } = build()
		const first = makeClient({
			id: 'socket-1',
			handshake: {
				auth: { token: 'token' },
				headers: {},
				query: {},
				address: '127.0.0.1',
			},
		})
		const second = makeClient({
			id: 'socket-2',
			handshake: {
				auth: { token: 'token' },
				headers: {},
				query: {},
				address: '127.0.0.1',
			},
		})

		await gateway.handleConnection(first as never)
		await gateway.handleConnection(second as never)

		expect(second.emit).toHaveBeenCalledWith('error', {
			message: 'Слишком много попыток переподключения',
		})
	})

	it('accepts bearer/query tokens and rejects an invalid token', async () => {
		const headerCase = build()
		const headerClient = makeClient({
			handshake: {
				auth: {},
				headers: { authorization: 'Bearer header-token' },
				query: {},
			},
		})
		await headerCase.gateway.handleConnection(headerClient as never)
		expect(headerCase.jwt.verify).toHaveBeenCalledWith('header-token')

		const invalid = build()
		invalid.jwt.verify.mockImplementation(() => {
			throw new Error('invalid')
		})
		const invalidClient = makeClient()
		await invalid.gateway.handleConnection(invalidClient as never)
		expect(invalidClient.emit).toHaveBeenCalledWith('error', {
			message: 'Недействительный токен',
		})
		expect(invalidClient.disconnect).toHaveBeenCalled()
	})

	it('subscribes only to presence of conversation partners', async () => {
		const { gateway, chatService } = build()
		chatService.hasConversation.mockImplementation(
			(_viewer: string, id: string) => Promise.resolve(id === 'user-2'),
		)
		const client = makeClient()

		await gateway.handleSubscribePresence(client as never, {
			userIds: ['user-2', 'user-3', 'user-2'],
			scope: 'active',
		})

		expect(chatService.hasConversation).toHaveBeenCalledTimes(2)
		expect((client.data as any).presenceSubscriptions?.get('active')).toEqual(
			new Set(['user-2']),
		)
		expect(client.emit).toHaveBeenCalledWith('presenceSnapshot', {
			userId: 'user-2',
			online: false,
		})
	})

	it('joins a conversation room, leaving the previous one', async () => {
		const { gateway, chatService } = build()
		const client = makeClient()

		await gateway.handleJoinRoom(client as never, { conversationId: 'conv-1' })

		expect(client.leave).toHaveBeenCalledWith('chat:old')
		expect(client.join).toHaveBeenCalledWith('chat:conv-1')
		expect(chatService.markAsRead).toHaveBeenCalledWith('conv-1', 'user-1')
	})

	it('rejects an invalid or forbidden room', async () => {
		const { gateway, chatService } = build()
		const client = makeClient()
		await expect(
			gateway.handleJoinRoom(client as never, { conversationId: '' }),
		).rejects.toBeInstanceOf(WsException)

		chatService.assertParticipant.mockRejectedValueOnce(new Error('no access'))
		await expect(
			gateway.handleJoinRoom(client as never, { conversationId: 'conv-1' }),
		).rejects.toThrow('Нет доступа')
	})

	it('saves and broadcasts a message with acknowledgement', async () => {
		const { gateway, chatService, server, serverEmit } = build()
		const client = makeClient()

		await gateway.handleSendMessage(client as never, {
			conversationId: 'conv-1',
			clientMessageId: 'client-1',
			content: ' hello ',
			attachmentUrl: 's3://bucket/file.pdf',
			attachmentName: 'file.pdf',
		})

		expect(chatService.saveMessage).toHaveBeenCalledWith(
			'conv-1',
			'user-1',
			' hello ',
			expect.objectContaining({ url: 's3://bucket/file.pdf' }),
			'client-1',
		)
		expect(server.to).toHaveBeenCalledWith('chat:conv-1')
		expect(serverEmit).toHaveBeenCalledWith(
			'messageAck',
			expect.objectContaining({ status: 'sent', messageId: 'message-1' }),
		)
	})

	it.each([
		['missing conversation', { conversationId: '', content: 'hi' }],
		['empty message', { conversationId: 'conv-1', content: '  ' }],
		['long message', { conversationId: 'conv-1', content: 'x'.repeat(2001) }],
	])('reports %s without throwing through the socket', async (_name, data) => {
		const { gateway } = build()
		const client = makeClient()
		await expect(
			gateway.handleSendMessage(client as never, data),
		).resolves.toBeUndefined()
		expect(client.emit).toHaveBeenCalledWith(
			'error',
			expect.objectContaining({ message: expect.any(String) }),
		)
	})

	it('rechecks email verification and rejects an unverified sender', async () => {
		const { gateway, chatService, serverEmit } = build()
		chatService.isEmailVerified.mockResolvedValue(false)
		const client = makeClient({
			data: { userId: 'user-1', userName: 'User', emailVerified: false },
		})

		await gateway.handleSendMessage(client as never, {
			conversationId: 'conv-1',
			content: 'hello',
			clientMessageId: 'client-1',
		})

		expect(client.emit).toHaveBeenCalledWith('error', {
			message: 'Подтвердите email, чтобы отправлять сообщения',
		})
		expect(serverEmit).toHaveBeenCalledWith('messageAck', {
			clientMessageId: 'client-1',
			status: 'failed',
		})
	})

	it('enforces the per-conversation send rate limit', async () => {
		process.env.CHAT_SEND_LIMIT = '1'
		process.env.CHAT_SEND_WINDOW_MS = '10000'
		const { gateway } = build()
		const client = makeClient()
		const data = { conversationId: 'conv-1', content: 'hello' }

		await gateway.handleSendMessage(client as never, data)
		await gateway.handleSendMessage(client as never, data)

		expect(client.emit).toHaveBeenCalledWith('error', {
			message: 'Слишком много запросов, попробуйте чуть позже',
		})
	})

	it('limits the total incoming event frequency', () => {
		process.env.SOCKET_MESSAGE_LIMIT = '1'
		process.env.SOCKET_MESSAGE_WINDOW_MS = '10000'
		const { gateway } = build()
		const client = makeClient()

		gateway.handlePresencePing(client as never)
		expect(() => gateway.handlePresencePing(client as never)).toThrow(
			'Слишком много запросов',
		)
	})

	it('rejects oversized events and temporarily blocks repeat abusers', async () => {
		process.env.SOCKET_MAX_EVENT_BYTES = '64'
		process.env.SOCKET_ABUSE_THRESHOLD = '1'
		const { gateway } = build()
		const client = makeClient()

		await gateway.handleSendMessage(client as never, {
			conversationId: 'conv-1',
			content: 'x'.repeat(100),
		})
		expect(client.emit).toHaveBeenCalledWith('error', {
			message: 'Событие превышает допустимый размер',
		})
		expect(client.disconnect).toHaveBeenCalledWith(true)

		const reconnect = makeClient({ id: 'socket-2' })
		await gateway.handleConnection(reconnect as never)
		expect(reconnect.emit).toHaveBeenCalledWith('error', {
			message: 'Пользователь временно заблокирован',
		})
	})

	it('enforces the number of joined application rooms', async () => {
		process.env.SOCKET_MAX_ROOMS = '1'
		const { gateway } = build()
		const client = makeClient({
			rooms: new Set(['socket-1', 'user:user-1']),
		})

		await expect(
			gateway.handleJoinRoom(client as never, { conversationId: 'conv-1' }),
		).rejects.toThrow('Превышен лимит комнат')
	})

	it('marks messages as read and broadcasts typing', async () => {
		const { gateway, chatService, server, serverEmit } = build()
		const client = makeClient()

		await gateway.handleMarkRead(client as never, { conversationId: 'conv-1' })
		expect(chatService.markAsRead).toHaveBeenCalledWith('conv-1', 'user-1')
		expect(client.roomEmit).toHaveBeenCalledWith('messagesRead', {
			conversationId: 'conv-1',
			byUserId: 'user-1',
		})

		await gateway.handleTyping(client as never, {
			conversationId: 'conv-1',
			isTyping: true,
		})
		expect(client.roomEmit).toHaveBeenCalledWith(
			'typing',
			expect.objectContaining({ fromUserId: 'user-1', isTyping: true }),
		)
		expect(server.to).toHaveBeenCalledWith('user:user-2')
		expect(serverEmit).toHaveBeenCalledWith('typing', expect.any(Object))
	})

	it('silently ignores unauthorized read and typing events', async () => {
		const { gateway, chatService } = build()
		chatService.assertParticipant.mockRejectedValue(new Error('forbidden'))
		const client = makeClient()

		await expect(
			gateway.handleMarkRead(client as never, { conversationId: 'conv-1' }),
		).resolves.toBeUndefined()
		await expect(
			gateway.handleTyping(client as never, { conversationId: 'conv-1' }),
		).resolves.toBeUndefined()
	})

	it('cleans up presence and rate state on disconnect', async () => {
		jest.useFakeTimers()
		const { gateway } = build()
		const client = makeClient()
		await gateway.handleConnection(client as never)
		await gateway.handleSubscribePresence(client as never, {
			userIds: ['user-2'],
		})
		gateway.handleDisconnect(client as never)

		expect((client.data as any).presenceSubscriptions).toEqual(new Map())
		jest.runOnlyPendingTimers()
		jest.useRealTimers()
	})

	it('broadcasts a message to the room and both users', () => {
		const { gateway, server } = build()
		gateway.emitNewMessage('conv-1', 'user-1', 'user-2', { id: 'm1' })
		expect(server.to).toHaveBeenCalledWith('chat:conv-1')
		expect(server.to).toHaveBeenCalledWith('user:user-1')
		expect(server.to).toHaveBeenCalledWith('user:user-2')
	})
})
