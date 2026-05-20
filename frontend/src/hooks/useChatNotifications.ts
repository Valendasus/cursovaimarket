import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const _rawUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const WS_URL = _rawUrl.replace(/\/api\/?$/, '')

export function useChatNotifications(enabled = true) {
	const token = useAuthStore(s => s.token)
	const queryClient = useQueryClient()
	const socketRef = useRef<Socket | null>(null)

	useEffect(() => {
		if (!enabled || !token) return

		if (!socketRef.current) {
			socketRef.current = io(`${WS_URL}/chat`, {
				auth: { token },
				transports: ['websocket', 'polling'],
				reconnectionAttempts: 5,
				reconnectionDelay: 1500,
			})
		}

		const socket = socketRef.current
		const onNewMessage = () => {
			queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
			queryClient.invalidateQueries({ queryKey: ['conversations'] })
		}

		socket.on('newMessage', onNewMessage)

		return () => {
			socket.off('newMessage', onNewMessage)
		}
	}, [enabled, token, queryClient])

	useEffect(() => {
		return () => {
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
		}
	}, [])
}
