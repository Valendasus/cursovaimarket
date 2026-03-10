import type { DirectMessage } from '@/api/chat'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const _rawUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const WS_URL = _rawUrl.replace(/\/api\/?$/, '')

export type ChatStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface UseChatSocketOptions {
	conversationId: string | null
	enabled?: boolean
}

interface UseChatSocketReturn {
	messages: DirectMessage[]
	status: ChatStatus
	sendMessage: (content: string) => Promise<void>
	markRead: () => void
}

export function useChatSocket({
	conversationId,
	enabled = true,
}: UseChatSocketOptions): UseChatSocketReturn {
	const token = useAuthStore(s => s.token)
	const queryClient = useQueryClient()
	const [messages, setMessages] = useState<DirectMessage[]>([])
	const [status, setStatus] = useState<ChatStatus>('idle')
	const socketRef = useRef<Socket | null>(null)

	const sendMessage = useCallback(
		async (content: string) => {
			if (!conversationId || !content.trim()) return

			if (socketRef.current?.connected) {
				socketRef.current.emit('sendMessage', {
					conversationId,
					content: content.trim(),
				})
			} else {
				const { sendDirectMessageHttp } = await import('@/api/chat')
				const msg = await sendDirectMessageHttp(conversationId, content.trim())
				setMessages(prev => [...prev, msg])
			}
		},
		[conversationId],
	)

	const markRead = useCallback(() => {
		if (!conversationId) return
		if (socketRef.current?.connected) {
			socketRef.current.emit('markRead', { conversationId })
		}
		queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
	}, [conversationId, queryClient])

	useEffect(() => {
		if (!enabled || !conversationId || !token) return

		setStatus('connecting')
		setMessages([])

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
			socket.emit('joinRoom', { conversationId })
		}

		const onHistory = (payload: { data: DirectMessage[] }) => {
			setMessages(payload.data)
		}

		const onNewMessage = (msg: DirectMessage) => {
			setMessages(prev => {
				if (prev.some(m => m.id === msg.id)) return prev
				return [...prev, msg]
			})
			queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
			queryClient.invalidateQueries({ queryKey: ['conversations'] })
		}

		const onMessagesRead = ({ byUserId }: { byUserId: string }) => {
			setMessages(prev =>
				prev.map(m => (m.senderId !== byUserId ? { ...m, isRead: true } : m)),
			)
		}

		const onError = () => setStatus('error')
		const onDisconnect = () =>
			setStatus(prev => (prev !== 'error' ? 'idle' : prev))

		socket.on('connect', onConnect)
		socket.on('history', onHistory)
		socket.on('newMessage', onNewMessage)
		socket.on('messagesRead', onMessagesRead)
		socket.on('connect_error', onError)
		socket.on('disconnect', onDisconnect)

		if (socket.connected) onConnect()

		return () => {
			socket.off('connect', onConnect)
			socket.off('history', onHistory)
			socket.off('newMessage', onNewMessage)
			socket.off('messagesRead', onMessagesRead)
			socket.off('connect_error', onError)
			socket.off('disconnect', onDisconnect)
		}
	}, [conversationId, token, enabled, queryClient])

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
