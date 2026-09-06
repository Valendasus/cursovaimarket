import apiClient from './client'

export interface DirectMessage {
	id: string
	conversationId: string
	senderId: string
	clientMessageId?: string | null
	localStatus?: 'pending' | 'sent' | 'failed'
	content?: string | null
	attachmentUrl?: string | null
	attachmentName?: string | null
	attachmentType?: string | null
	attachmentSize?: number | null
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
		content?: string | null
		createdAt: string
		senderId: string
		attachmentName?: string | null
		attachmentType?: string | null
	} | null
	updatedAt: string
}

export interface ChatAttachmentPayload {
	url: string
	name?: string
	type?: string
	size?: number
}

export interface SendMessagePayload {
	clientMessageId?: string
	content?: string
	attachmentUrl?: string
	attachmentName?: string
	attachmentType?: string
	attachmentSize?: number
}

export interface UploadChatFileResponse {
	url: string
	name: string
	type: string
	size: number
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
	payload: SendMessagePayload,
): Promise<DirectMessage> {
	const { data } = await apiClient.post<DirectMessage>(
		`/v1/chat/conversations/${conversationId}`,
		payload,
	)
	return data
}

/** POST /chat/conversations/:id/files — upload attachment */
export async function uploadChatFile(
	conversationId: string,
	file: File,
): Promise<UploadChatFileResponse> {
	const formData = new FormData()
	formData.append('file', file)
	const { data } = await apiClient.post<UploadChatFileResponse>(
		`/v1/chat/conversations/${conversationId}/files`,
		formData,
		{
			headers: { 'Content-Type': 'multipart/form-data' },
		},
	)
	return data
}

/** PATCH /chat/conversations/:id/read */
export async function markConversationRead(
	conversationId: string,
): Promise<void> {
	await apiClient.patch(`/v1/chat/conversations/${conversationId}/read`)
}

/** GET /chat/unread/counts */
export async function getUnreadCounts(): Promise<Record<string, number>> {
	const { data } = await apiClient.get<Record<string, number>>(
		'/v1/chat/unread/counts',
	)
	return data
}
