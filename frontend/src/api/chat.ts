import apiClient from './client'

export interface DirectMessage {
	id: string
	conversationId: string
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

export interface Conversation {
	id: string
	partner: {
		id: string
		name: string
		avatar?: string | null
	}
	lastMessage: {
		content: string
		createdAt: string
		senderId: string
	} | null
	updatedAt: string
}

export interface MessageHistoryResponse {
	data: DirectMessage[]
	total: number
	page: number
	limit: number
}

/** GET /chat/conversations */
export async function getConversations(): Promise<Conversation[]> {
	const { data } = await apiClient.get<Conversation[]>('/v1/chat/conversations')
	return data
}

/** POST /chat/conversations — find or create conversation with partner */
export async function findOrCreateConversation(
	partnerId: string,
): Promise<Conversation & { userAId: string; userBId: string }> {
	const { data } = await apiClient.post<
		Conversation & { userAId: string; userBId: string }
	>('/v1/chat/conversations', { partnerId })
	return data
}

/** GET /chat/conversations/:id */
export async function getConversationMessages(
	conversationId: string,
	page = 1,
	limit = 50,
): Promise<MessageHistoryResponse> {
	const { data } = await apiClient.get<MessageHistoryResponse>(
		`/v1/chat/conversations/${conversationId}`,
		{ params: { page, limit } },
	)
	return data
}

/** POST /chat/conversations/:id — send message (REST fallback) */
export async function sendDirectMessageHttp(
	conversationId: string,
	content: string,
): Promise<DirectMessage> {
	const { data } = await apiClient.post<DirectMessage>(
		`/v1/chat/conversations/${conversationId}`,
		{ content },
	)
	return data
}

/** PATCH /chat/conversations/:id/read */
export async function markConversationRead(conversationId: string): Promise<void> {
	await apiClient.patch(`/v1/chat/conversations/${conversationId}/read`)
}

/** GET /chat/unread/counts */
export async function getUnreadCounts(): Promise<Record<string, number>> {
	const { data } = await apiClient.get<Record<string, number>>(
		'/v1/chat/unread/counts',
	)
	return data
}
