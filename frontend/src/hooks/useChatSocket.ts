import type { DirectMessage } from '@/api/chat'
import { acquireChatSocket, releaseChatSocket } from '@/lib/chatSocket'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'

export type ChatStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface UseChatSocketOptions {
	conversationId: string | null
	partnerId?: string | null
	enabled?: boolean
}

interface UseChatSocketReturn {
	messages: DirectMessage[]
	status: ChatStatus
	sendMessage: (payload: { content?: string; file?: File }) => Promise<void>
	retryMessage: (clientMessageId: string) => void
	markRead: () => void
	setTyping: (isTyping: boolean) => void
	isPartnerOnline: boolean | null
	isPartnerTyping: boolean
	sendError: string
	sendBlocked: boolean
}

export function useChatSocket({
	conversationId,
	partnerId,
	enabled = true,
}: UseChatSocketOptions): UseChatSocketReturn {
	const token = useAuthStore(s => s.token)
	const currentUser = useAuthStore(s => s.user)
	const queryClient = useQueryClient()
	const [messages, setMessages] = useState<DirectMessage[]>([])
	const [status, setStatus] = useState<ChatStatus>('idle')
	const [isPartnerOnline, setIsPartnerOnline] = useState<boolean | null>(null)
	const [isPartnerTyping, setIsPartnerTyping] = useState(false)
	const [sendError, setSendError] = useState('')
	const [sendBlocked, setSendBlocked] = useState(false)
	const socketRef = useRef<Socket | null>(null)
	const historyFetchIdRef = useRef(0)
	const typingTimeoutRef = useRef<number | null>(null)
	const typingSentAtRef = useRef(0)
	const sendErrorTimeoutRef = useRef<number | null>(null)
	const sendBlockedTimeoutRef = useRef<number | null>(null)
	const sendQueueRef = useRef<
		{
			conversationId: string
			payload: {
				clientMessageId: string
				content?: string
				attachmentUrl?: string
				attachmentName?: string
				attachmentType?: string
				attachmentSize?: number
			}
		}[]
	>([])
	const pendingStoreRef = useRef<
		Record<
			string,
			{
				conversationId: string
				payload: {
					clientMessageId: string
					content?: string
					attachmentUrl?: string
					attachmentName?: string
					attachmentType?: string
					attachmentSize?: number
				}
				createdAt: string
			}
		>
	>({})
	const processingRef = useRef(false)
	const lastSendAtRef = useRef(0)
	const sendIntervalMs = 600
	const sendCooldownMs = 400
	const pendingStorageKey = currentUser?.id
		? `chat:pending:${currentUser.id}`
		: 'chat:pending:anon'

	const persistPending = useCallback(() => {
		try {
			localStorage.setItem(
				pendingStorageKey,
				JSON.stringify(pendingStoreRef.current),
			)
		} catch {
			// ignore storage errors
		}
	}, [pendingStorageKey])

	const loadPending = useCallback(() => {
		try {
			const raw = localStorage.getItem(pendingStorageKey)
			if (!raw) return
			const data = JSON.parse(raw) as Record<
				string,
				{
					conversationId: string
					payload: {
						clientMessageId: string
						content?: string
						attachmentUrl?: string
						attachmentName?: string
						attachmentType?: string
						attachmentSize?: number
					}
					createdAt: string
				}
			>
			pendingStoreRef.current = data
		} catch {
			pendingStoreRef.current = {}
		}
	}, [pendingStorageKey])

	const flushQueue = useCallback(async () => {
		if (processingRef.current) return
		processingRef.current = true

		while (sendQueueRef.current.length) {
			const item = sendQueueRef.current.shift()
			if (!item) continue
			const now = Date.now()
			const waitMs = Math.max(0, sendIntervalMs - (now - lastSendAtRef.current))
			if (waitMs > 0) {
				await new Promise(resolve => window.setTimeout(resolve, waitMs))
			}
			lastSendAtRef.current = Date.now()
			if (socketRef.current?.connected) {
				socketRef.current.emit('sendMessage', {
					conversationId: item.conversationId,
					...item.payload,
				})
			} else {
				console.warn('[chat] fallback to HTTP send', {
					conversationId: item.conversationId,
					clientMessageId: item.payload.clientMessageId,
				})
				const { sendDirectMessageHttp } = await import('@/api/chat')
				try {
					const msg = await sendDirectMessageHttp(
						item.conversationId,
						item.payload,
					)
					setMessages(prev => {
						const idx = prev.findIndex(
							m =>
								m.clientMessageId && m.clientMessageId === msg.clientMessageId,
						)
						if (idx === -1) return [...prev, msg]
						const next = [...prev]
						next[idx] = msg
						return next
					})
					delete pendingStoreRef.current[item.payload.clientMessageId]
					persistPending()
				} catch {
					console.warn('[chat] HTTP send failed', {
						conversationId: item.conversationId,
						clientMessageId: item.payload.clientMessageId,
					})
					setMessages(prev =>
						prev.map(m =>
							m.clientMessageId === item.payload.clientMessageId
								? { ...m, localStatus: 'failed' }
								: m,
						),
					)
				}
			}
		}

		processingRef.current = false
	}, [persistPending])

	const sendMessage = useCallback(
		async ({ content, file }: { content?: string; file?: File }) => {
			if (!conversationId) return
			const trimmed = content?.trim()
			if (!trimmed && !file) return
			if (processingRef.current || sendQueueRef.current.length > 0) {
				setSendBlocked(true)
				setSendError('Подождите, сообщение отправляется')
				if (sendErrorTimeoutRef.current) {
					window.clearTimeout(sendErrorTimeoutRef.current)
				}
				sendErrorTimeoutRef.current = window.setTimeout(() => {
					setSendError('')
					sendErrorTimeoutRef.current = null
				}, sendCooldownMs)
				if (sendBlockedTimeoutRef.current) {
					window.clearTimeout(sendBlockedTimeoutRef.current)
				}
				sendBlockedTimeoutRef.current = window.setTimeout(() => {
					setSendBlocked(false)
					sendBlockedTimeoutRef.current = null
				}, sendCooldownMs)
				return
			}

			let attachment:
				| {
						url: string
						name?: string
						type?: string
						size?: number
				  }
				| undefined
			if (file) {
				const { uploadChatFile } = await import('@/api/chat')
				const uploaded = await uploadChatFile(conversationId, file)
				attachment = {
					url: uploaded.url,
					name: uploaded.name,
					type: uploaded.type,
					size: uploaded.size,
				}
			}

			const clientMessageId = `c-${Date.now().toString(36)}-${Math.random()
				.toString(36)
				.slice(2, 8)}`
			const payload = {
				clientMessageId,
				content: trimmed,
				attachmentUrl: attachment?.url,
				attachmentName: attachment?.name,
				attachmentType: attachment?.type,
				attachmentSize: attachment?.size,
			}
			pendingStoreRef.current[clientMessageId] = {
				conversationId,
				payload,
				createdAt: new Date().toISOString(),
			}
			persistPending()
			const senderName = currentUser?.name || 'Вы'
			setMessages(prev => [
				...prev,
				{
					id: `client:${clientMessageId}`,
					conversationId,
					senderId: currentUser?.id ?? 'me',
					clientMessageId,
					localStatus: 'pending',
					content: trimmed,
					attachmentUrl: attachment?.url ?? null,
					attachmentName: attachment?.name ?? null,
					attachmentType: attachment?.type ?? null,
					attachmentSize: attachment?.size ?? null,
					isRead: false,
					createdAt: new Date().toISOString(),
					sender: {
						id: currentUser?.id ?? 'me',
						name: senderName,
						avatar: currentUser?.avatar ?? null,
					},
				},
			])
			sendQueueRef.current.push({ conversationId, payload })
			void flushQueue()
		},
		[conversationId, currentUser, flushQueue, persistPending],
	)

	const retryMessage = useCallback(
		(clientMessageId: string) => {
			const record = pendingStoreRef.current[clientMessageId]
			if (!record) return
			sendQueueRef.current.push({
				conversationId: record.conversationId,
				payload: record.payload,
			})
			setMessages(prev =>
				prev.map(m =>
					m.clientMessageId === clientMessageId
						? { ...m, localStatus: 'pending' }
						: m,
				),
			)
			void flushQueue()
		},
		[flushQueue],
	)

	const markRead = useCallback(() => {
		if (!conversationId) return
		if (socketRef.current?.connected) {
			socketRef.current.emit('markRead', { conversationId })
		} else {
			void (async () => {
				const { markConversationRead } = await import('@/api/chat')
				await markConversationRead(conversationId)
			})()
		}
		queryClient.setQueryData<Record<string, number>>(
			['unread-counts'],
			prev => ({ ...(prev ?? {}), [conversationId]: 0 }),
		)
		queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
	}, [conversationId, queryClient])

	const setTyping = useCallback(
		(isTyping: boolean) => {
			if (!conversationId || !socketRef.current?.connected) return
			if (isTyping) {
				const now = Date.now()
				if (now - typingSentAtRef.current < 1000) return
				typingSentAtRef.current = now
			}
			socketRef.current.emit('typing', { conversationId, isTyping })
		},
		[conversationId],
	)

	useEffect(() => {
		if (!enabled || !conversationId || !token) return

		setStatus('connecting')
		setMessages([])
		const fetchId = ++historyFetchIdRef.current
		void (async () => {
			const { getConversationMessages } = await import('@/api/chat')
			let page = 1
			const limit = 200
			let total = 0
			let all: DirectMessage[] = []
			while (true) {
				const history = await getConversationMessages(
					conversationId,
					page,
					limit,
				)
				if (historyFetchIdRef.current !== fetchId) return
				total = history.total
				all = all.concat(history.data)
				if (history.data.length === 0) break
				if (all.length >= total) break
				page += 1
			}
			let pendingChanged = false
			all.forEach(msg => {
				if (
					msg.clientMessageId &&
					pendingStoreRef.current[msg.clientMessageId]
				) {
					delete pendingStoreRef.current[msg.clientMessageId]
					pendingChanged = true
				}
			})
			if (pendingChanged) persistPending()
			setMessages(prev => {
				const merged = [...prev]
				const indexById = new Map(merged.map((msg, index) => [msg.id, index]))
				const indexByClientId = new Map<string, number>()
				merged.forEach((msg, index) => {
					if (msg.clientMessageId) {
						indexByClientId.set(msg.clientMessageId, index)
					}
				})
				all.forEach(msg => {
					const existingIndex =
						indexById.get(msg.id) ??
						(msg.clientMessageId
							? indexByClientId.get(msg.clientMessageId)
							: undefined)
					if (existingIndex !== undefined) {
						merged[existingIndex] = msg
						return
					}
					indexById.set(msg.id, merged.length)
					if (msg.clientMessageId) {
						indexByClientId.set(msg.clientMessageId, merged.length)
					}
					merged.push(msg)
				})
				merged.sort(
					(a, b) =>
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
				)
				return merged
			})
		})()

		const socket = acquireChatSocket(token)
		socketRef.current = socket

		const onConnect = () => {
			setStatus('connected')
			socket.emit('joinRoom', { conversationId })
			if (partnerId) {
				socket.emit('subscribePresence', {
					userIds: [partnerId],
					scope: 'active',
				})
			}
		}

		const onNewMessage = (msg: DirectMessage) => {
			setMessages(prev => {
				if (msg.clientMessageId) {
					const idx = prev.findIndex(
						m => m.clientMessageId === msg.clientMessageId,
					)
					if (idx !== -1) {
						const next = [...prev]
						next[idx] = msg
						return next
					}
				}
				if (prev.some(m => m.id === msg.id)) return prev
				return [...prev, msg]
			})
			if (msg.clientMessageId) {
				delete pendingStoreRef.current[msg.clientMessageId]
				persistPending()
			}
			// Помечаем прочитанным только если вкладка на виду. Пришло сообщение,
			// пока вкладка свёрнута, — оставляем непрочитанным (его пометит
			// visibilitychange, когда пользователь вернётся, — см. эффект ниже).
			if (
				msg.senderId &&
				msg.senderId !== (currentUser?.id ?? '') &&
				document.visibilityState === 'visible'
			) {
				markRead()
			}
			queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
			queryClient.invalidateQueries({ queryKey: ['conversations'] })
		}

		const onMessageAck = (payload: {
			clientMessageId: string
			status: 'sent' | 'failed'
			messageId?: string
		}) => {
			setMessages(prev =>
				prev.map(m =>
					m.clientMessageId === payload.clientMessageId
						? {
								...m,
								localStatus: payload.status,
								id: payload.messageId ? payload.messageId : m.id,
							}
						: m,
				),
			)
			if (payload.status === 'failed') {
				console.warn('[chat] message ack failed', payload)
				return
			}
			delete pendingStoreRef.current[payload.clientMessageId]
			persistPending()
		}

		const onMessagesRead = ({ byUserId }: { byUserId: string }) => {
			setMessages(prev =>
				prev.map(m => (m.senderId !== byUserId ? { ...m, isRead: true } : m)),
			)
		}

		const onPresenceUpdate = (payload: { userId: string; online: boolean }) => {
			if (!partnerId || payload.userId !== partnerId) return
			setIsPartnerOnline(payload.online)
		}

		const onPresenceSnapshot = (payload: {
			userId: string
			online: boolean
		}) => {
			if (!partnerId || payload.userId !== partnerId) return
			setIsPartnerOnline(payload.online)
		}

		const onTyping = (payload: {
			conversationId: string
			fromUserId: string
			isTyping: boolean
		}) => {
			if (!partnerId || payload.fromUserId !== partnerId) return
			if (payload.conversationId !== conversationId) return
			if (typingTimeoutRef.current) {
				window.clearTimeout(typingTimeoutRef.current)
				typingTimeoutRef.current = null
			}
			setIsPartnerTyping(payload.isTyping)
			if (payload.isTyping) {
				typingTimeoutRef.current = window.setTimeout(() => {
					setIsPartnerTyping(false)
					typingTimeoutRef.current = null
				}, 2000)
			}
		}

		const onConnectError = (err: Error) => {
			console.warn('[chat] socket connect error', err?.message)
			setStatus('error')
		}
		const onDisconnect = () =>
			setStatus(prev => (prev !== 'error' ? 'idle' : prev))

		socket.on('connect', onConnect)
		socket.on('newMessage', onNewMessage)
		socket.on('messagesRead', onMessagesRead)
		socket.on('messageAck', onMessageAck)
		socket.on('presenceUpdate', onPresenceUpdate)
		socket.on('presenceSnapshot', onPresenceSnapshot)
		socket.on('typing', onTyping)
		socket.on('connect_error', onConnectError)
		socket.on('disconnect', onDisconnect)

		if (socket.connected) onConnect()

		return () => {
			if (socket.connected) {
				socket.emit('subscribePresence', { userIds: [], scope: 'active' })
			}
			socket.off('connect', onConnect)
			socket.off('newMessage', onNewMessage)
			socket.off('messagesRead', onMessagesRead)
			socket.off('messageAck', onMessageAck)
			socket.off('presenceUpdate', onPresenceUpdate)
			socket.off('presenceSnapshot', onPresenceSnapshot)
			socket.off('typing', onTyping)
			socket.off('connect_error', onConnectError)
			socket.off('disconnect', onDisconnect)
			releaseChatSocket(socket)
		}
	}, [
		conversationId,
		token,
		enabled,
		queryClient,
		markRead,
		partnerId,
		currentUser,
		persistPending,
	])

	useEffect(() => {
		if (!partnerId) {
			setIsPartnerOnline(null)
			setIsPartnerTyping(false)
			if (socketRef.current?.connected) {
				socketRef.current.emit('subscribePresence', {
					userIds: [],
					scope: 'active',
				})
			}
			return
		}
		if (socketRef.current?.connected) {
			socketRef.current.emit('subscribePresence', {
				userIds: [partnerId],
				scope: 'active',
			})
		}
	}, [partnerId])

	useEffect(() => {
		setIsPartnerTyping(false)
	}, [conversationId])

	// Пользователь вернулся на вкладку с открытым чатом — отмечаем прочитанным
	// сообщения, пришедшие пока вкладка была свёрнута.
	useEffect(() => {
		if (!conversationId) return
		const onVisible = () => {
			if (document.visibilityState === 'visible') markRead()
		}
		document.addEventListener('visibilitychange', onVisible)
		return () => document.removeEventListener('visibilitychange', onVisible)
	}, [conversationId, markRead])

	useEffect(() => {
		sendQueueRef.current = []
		processingRef.current = false
	}, [conversationId])

	useEffect(() => {
		if (!conversationId) return
		loadPending()
		const pending = Object.values(pendingStoreRef.current).filter(
			item => item.conversationId === conversationId,
		)
		if (!pending.length) return
		setMessages(prev => {
			const next = [...prev]
			pending.forEach(item => {
				if (
					next.some(m => m.clientMessageId === item.payload.clientMessageId)
				) {
					return
				}
				next.push({
					id: `client:${item.payload.clientMessageId}`,
					conversationId: item.conversationId,
					senderId: currentUser?.id ?? 'me',
					clientMessageId: item.payload.clientMessageId,
					localStatus: 'failed',
					content: item.payload.content,
					attachmentUrl: item.payload.attachmentUrl ?? null,
					attachmentName: item.payload.attachmentName ?? null,
					attachmentType: item.payload.attachmentType ?? null,
					attachmentSize: item.payload.attachmentSize ?? null,
					isRead: false,
					createdAt: item.createdAt,
					sender: {
						id: currentUser?.id ?? 'me',
						name: currentUser?.name || 'Вы',
						avatar: currentUser?.avatar ?? null,
					},
				})
			})
			next.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			)
			return next
		})
	}, [conversationId, currentUser, loadPending])

	useEffect(() => {
		return () => {
			if (sendErrorTimeoutRef.current) {
				window.clearTimeout(sendErrorTimeoutRef.current)
				sendErrorTimeoutRef.current = null
			}
			if (sendBlockedTimeoutRef.current) {
				window.clearTimeout(sendBlockedTimeoutRef.current)
				sendBlockedTimeoutRef.current = null
			}
		}
	}, [])

	return {
		messages,
		status,
		sendMessage,
		retryMessage,
		markRead,
		setTyping,
		isPartnerOnline,
		isPartnerTyping,
		sendError,
		sendBlocked,
	}
}
