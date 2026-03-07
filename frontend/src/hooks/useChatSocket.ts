import type { ChatMessage } from '@/api/chat'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

// Strip trailing /api path to get the base WS server URL
const _rawUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const WS_URL = _rawUrl.replace(/\/api\/?$/, '')

export type ChatStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface UseChatSocketOptions {
	orderId: string | null
	enabled?: boolean
}

interface UseChatSocketReturn {
	messages: ChatMessage[]
	status: ChatStatus
	sendMessage: (content: string) => Promise<void>
	markRead: () => void
}

export function useChatSocket({
	orderId,
	enabled = true,
}: UseChatSocketOptions): UseChatSocketReturn {
	const token = useAuthStore(s => s.token)
	const queryClient = useQueryClient()
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [status, setStatus] = useState<ChatStatus>('idle')
	const socketRef = useRef<Socket | null>(null)
	const currentOrderRef = useRef<string | null>(null)

	// Send message — tries WS first, falls back to HTTP
	const sendMessage = useCallback(
		async (content: string) => {
			if (!orderId || !content.trim()) return

			if (socketRef.current?.connected) {
				socketRef.current.emit('sendMessage', {
					orderId,
					content: content.trim(),
				})
			} else {
				// HTTP fallback
				const { sendMessageHttp } = await import('@/api/chat')
				const msg = await sendMessageHttp(orderId, content.trim())
				setMessages(prev => [...prev, msg])
			}
		},
		[orderId],
	)

	const markRead = useCallback(() => {
		if (!orderId) return
		if (socketRef.current?.connected) {
			socketRef.current.emit('markRead', { orderId })
		}
		// Immediately clear unread badge in cache
		queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
	}, [orderId, queryClient])

	useEffect(() => {
		if (!enabled || !orderId || !token) {
			return
		}

		setStatus('connecting')
		setMessages([])

		// Re-create socket if token changed (auth refresh) or if not yet created
		const currentToken = (
			socketRef.current?.auth as { token?: string } | undefined
		)?.token
		if (!socketRef.current || currentToken !== token) {
			socketRef.current?.disconnect()
			socketRef.current = io(`${WS_URL}/chat`, {
				auth: { token },
				transports: ['websocket', 'polling'],
				reconnectionAttempts: 5,
				reconnectionDelay: 1500,
			})
		}

		const socket = socketRef.current

		const onConnect = () => {
			setStatus('connected')
			socket.emit('joinRoom', { orderId })
			currentOrderRef.current = orderId
		}

		const onHistory = (payload: { data: ChatMessage[] }) => {
			setMessages(payload.data)
		}

		const onNewMessage = (msg: ChatMessage) => {
			setMessages(prev => {
				// Deduplicate by id
				if (prev.some(m => m.id === msg.id)) return prev
				return [...prev, msg]
			})
			// New incoming message → refresh unread badge
			queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
		}

		// Other participant marked our messages as read → update receipts
		const onMessagesRead = ({
			byUserId,
		}: {
			orderId: string
			byUserId: string
		}) => {
			setMessages(prev =>
				prev.map(m => (m.senderId !== byUserId ? { ...m, isRead: true } : m)),
			)
		}

		const onError = () => {
			setStatus('error')
		}

		// Use functional update to avoid stale closure on status
		const onDisconnect = () => {
			setStatus(prev => (prev !== 'error' ? 'idle' : prev))
		}

		socket.on('connect', onConnect)
		socket.on('history', onHistory)
		socket.on('newMessage', onNewMessage)
		socket.on('messagesRead', onMessagesRead)
		socket.on('connect_error', onError)
		socket.on('disconnect', onDisconnect)

		// If already connected but room changed
		if (socket.connected) {
			onConnect()
		}

		return () => {
			socket.off('connect', onConnect)
			socket.off('history', onHistory)
			socket.off('newMessage', onNewMessage)
			socket.off('messagesRead', onMessagesRead)
			socket.off('connect_error', onError)
			socket.off('disconnect', onDisconnect)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [orderId, token, enabled])

	// Disconnect when component fully unmounts
	useEffect(() => {
		return () => {
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
		}
	}, [])

	return { messages, status, sendMessage, markRead }
}
