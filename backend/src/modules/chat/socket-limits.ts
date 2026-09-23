export interface SocketLimits {
	maxConnectionsPerUser: number
	maxConnectionsPerIp: number
	messageLimit: number
	messageWindowMs: number
	chatSendLimit: number
	chatSendWindowMs: number
	maxEventBytes: number
	maxRooms: number
	reconnectLimit: number
	reconnectWindowMs: number
	pingIntervalMs: number
	pingTimeoutMs: number
	abuseThreshold: number
	abuseWindowMs: number
	blockDurationMs: number
}

function positiveInt(name: string, fallback: number): number {
	const value = Number(process.env[name])
	return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

/** Centralised, validated Socket.IO safety limits. */
export function getSocketLimits(): SocketLimits {
	return {
		maxConnectionsPerUser: positiveInt('SOCKET_MAX_CONNECTIONS_PER_USER', 5),
		maxConnectionsPerIp: positiveInt('SOCKET_MAX_CONNECTIONS_PER_IP', 30),
		messageLimit: positiveInt('SOCKET_MESSAGE_LIMIT', 120),
		messageWindowMs: positiveInt('SOCKET_MESSAGE_WINDOW_MS', 10_000),
		chatSendLimit: positiveInt('CHAT_SEND_LIMIT', 20),
		chatSendWindowMs: positiveInt('CHAT_SEND_WINDOW_MS', 10_000),
		maxEventBytes: positiveInt('SOCKET_MAX_EVENT_BYTES', 32 * 1024),
		// Socket.IO's private room (socket id) is not included.
		maxRooms: positiveInt('SOCKET_MAX_ROOMS', 2),
		reconnectLimit: positiveInt('SOCKET_RECONNECT_LIMIT', 20),
		reconnectWindowMs: positiveInt('SOCKET_RECONNECT_WINDOW_MS', 60_000),
		pingIntervalMs: positiveInt('SOCKET_PING_INTERVAL_MS', 25_000),
		pingTimeoutMs: positiveInt('SOCKET_PING_TIMEOUT_MS', 20_000),
		abuseThreshold: positiveInt('SOCKET_ABUSE_THRESHOLD', 5),
		abuseWindowMs: positiveInt('SOCKET_ABUSE_WINDOW_MS', 60_000),
		blockDurationMs: positiveInt('SOCKET_BLOCK_DURATION_MS', 15 * 60_000),
	}
}
