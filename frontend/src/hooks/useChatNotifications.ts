import { acquireChatSocket, releaseChatSocket } from '@/lib/chatSocket'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'

export function useChatNotifications(enabled = true) {
	const token = useAuthStore(s => s.token)
	const queryClient = useQueryClient()
	const socketRef = useRef<Socket | null>(null)

	useEffect(() => {
		if (!enabled || !token) return

		const socket = acquireChatSocket(token)
		socketRef.current = socket
		const onNewMessage = () => {
			queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
			queryClient.invalidateQueries({ queryKey: ['conversations'] })
		}

		socket.on('newMessage', onNewMessage)

		return () => {
			socket.off('newMessage', onNewMessage)
			releaseChatSocket(socket)
		}
	}, [enabled, token, queryClient])

	useEffect(() => {
		return () => {
			if (socketRef.current) {
				releaseChatSocket(socketRef.current)
				socketRef.current = null
			}
		}
	}, [])
}
