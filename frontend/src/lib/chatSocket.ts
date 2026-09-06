import { io, Socket } from 'socket.io-client'

const RAW_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const WS_URL = RAW_URL.replace(/\/api\/?$/, '')

let socket: Socket | null = null
let socketToken: string | null = null
let refCount = 0
let heartbeatId: number | null = null

const startHeartbeat = (sock: Socket) => {
	if (heartbeatId) return
	heartbeatId = window.setInterval(() => {
		if (sock.connected) {
			sock.emit('presencePing')
		}
	}, 25000)
}

const stopHeartbeat = () => {
	if (heartbeatId) {
		window.clearInterval(heartbeatId)
		heartbeatId = null
	}
}

export const acquireChatSocket = (token: string): Socket => {
	refCount += 1
	if (!socket || socketToken !== token) {
		socket?.disconnect()
		stopHeartbeat()
		socket = io(`${WS_URL}/chat`, {
			auth: { token },
			transports: ['websocket', 'polling'],
			reconnectionAttempts: 5,
			reconnectionDelay: 1500,
		})
		socketToken = token
		socket.on('connect', () => startHeartbeat(socket!))
		socket.on('disconnect', () => stopHeartbeat())
		if (socket.connected) {
			startHeartbeat(socket)
		}
	}
	return socket
}

export const releaseChatSocket = (sock: Socket) => {
	refCount = Math.max(0, refCount - 1)
	if (refCount === 0 && socket === sock) {
		stopHeartbeat()
		socket.disconnect()
		socket = null
		socketToken = null
	}
}
