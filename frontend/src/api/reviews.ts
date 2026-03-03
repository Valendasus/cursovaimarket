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

export interface ReviewsResponse {
	data: Review[]
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
