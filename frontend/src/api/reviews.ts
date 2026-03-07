import apiClient from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Review {
	id: string
	serviceId: string
	orderId: string
	authorId: string
	rating: number
	comment?: string | null
	createdAt: string
	author: {
		id: string
		name: string
		avatar?: string | null
	}
}

export interface ReviewWithService extends Review {
	service: {
		id: string
		title: string
		freelancer?: { id: string; name: string; avatar?: string | null }
	}
}

export interface ReceivedReview {
	id: string
	serviceId: string
	orderId: string
	authorId: string
	rating: number
	comment?: string | null
	createdAt: string
	author: { id: string; name: string; avatar?: string | null }
	service: { id: string; title: string }
}

export interface ReviewsResponse {
	data: Review[]
	total: number
	page: number
	limit: number
}

export interface MyReviewsResponse {
	data: ReviewWithService[]
	total: number
	page: number
	limit: number
}

export interface ReceivedReviewsResponse {
	data: ReceivedReview[]
	total: number
	page: number
	limit: number
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getServiceReviews(
	serviceId: string,
	page = 1,
	limit = 10,
): Promise<ReviewsResponse> {
	const { data } = await apiClient.get<ReviewsResponse>(
		`/v1/reviews/service/${serviceId}`,
		{ params: { page, limit } },
	)
	return data
}

export async function getMyReviews(
	page = 1,
	limit = 20,
): Promise<MyReviewsResponse> {
	const { data } = await apiClient.get<MyReviewsResponse>('/v1/reviews/my', {
		params: { page, limit },
	})
	return data
}

export async function getReceivedReviews(
	page = 1,
	limit = 20,
): Promise<ReceivedReviewsResponse> {
	const { data } = await apiClient.get<ReceivedReviewsResponse>(
		'/v1/reviews/received',
		{ params: { page, limit } },
	)
	return data
}

export async function createReview(
	orderId: string,
	rating: number,
	comment?: string,
): Promise<Review> {
	const { data } = await apiClient.post<Review>('/v1/reviews', {
		orderId,
		rating,
		comment: comment?.trim() || undefined,
	})
	return data
}
