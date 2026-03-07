import apiClient from './client'

export interface ChatMessage {
	id: string
	orderId: string
	senderId: string
	content: string
	isRead: boolean
	createdAt: string
	sender: {
		id: string
		name: string
		avatar?: string | null
	}
}

export interface ChatHistoryResponse {
	data: ChatMessage[]
	total: number
	page: number
	limit: number
}

/** GET /chat/:orderId — message history (HTTP fallback) */
export async function getChatHistory(
	orderId: string,
	page = 1,
	limit = 50,
): Promise<ChatHistoryResponse> {
	const { data } = await apiClient.get<ChatHistoryResponse>(
		`/v1/chat/${orderId}`,
		{ params: { page, limit } },
	)
	return data
}

/** POST /chat/:orderId — send message via REST fallback */
export async function sendMessageHttp(
	orderId: string,
	content: string,
): Promise<ChatMessage> {
	const { data } = await apiClient.post<ChatMessage>(`/v1/chat/${orderId}`, {
		content,
	})
	return data
}

/** PATCH /chat/:orderId/read — mark messages as read */
export async function markChatRead(orderId: string): Promise<void> {
	await apiClient.patch(`/v1/chat/${orderId}/read`)
}

/** GET /chat/unread/counts — unread counts per orderId */
export async function getUnreadCounts(): Promise<Record<string, number>> {
	const { data } = await apiClient.get<Record<string, number>>(
		'/v1/chat/unread/counts',
	)
	return data
}
