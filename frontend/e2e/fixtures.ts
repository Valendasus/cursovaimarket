import type { Page, Route } from '@playwright/test'

export const student = {
	id: 'student-1',
	email: 'student@example.com',
	name: 'Тестовый заказчик',
	role: 'STUDENT',
	emailVerified: true,
	createdAt: '2026-01-01T00:00:00.000Z',
	profile: null,
}

export const freelancer = {
	id: 'freelancer-1',
	email: 'freelancer@example.com',
	name: 'Тестовый исполнитель',
	role: 'FREELANCER',
	emailVerified: true,
	createdAt: '2026-01-01T00:00:00.000Z',
	profile: {
		bio: 'Помогаю с учебными работами',
		rating: 5,
		reviewsCount: 3,
		completedOrders: 8,
		specializations: ['MATHEMATICS'],
		isVerified: true,
		responseTime: '~1 час',
	},
}

export const service = {
	id: 'service-1',
	freelancerId: freelancer.id,
	freelancer,
	title: 'Курсовая по высшей математике',
	description: 'Подготовка и оформление курсовой работы.',
	category: 'MATHEMATICS',
	level: 'BACHELOR',
	tags: ['математика'],
	images: [],
	rating: 5,
	reviewsCount: 3,
	ordersCount: 8,
	isFeatured: false,
	createdAt: '2026-01-01T00:00:00.000Z',
	packages: [
		{
			id: 'package-1',
			name: 'Базовый',
			price: 300000,
			deliveryDays: 7,
			revisions: 2,
			description: 'Полная работа',
			features: [],
		},
	],
}

export interface ApiState {
	createdService?: Record<string, unknown>
	createdOrder?: Record<string, unknown>
	sentMessage?: Record<string, unknown>
	uploadedFile: boolean
}

type MockOptions = {
	user?: typeof student | typeof freelancer | null
	services?: typeof service[]
}

async function json(route: Route, body: unknown, status = 200) {
	await route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	})
}

export async function installApiMocks(
	page: Page,
	options: MockOptions = {},
): Promise<ApiState> {
	const state: ApiState = { uploadedFile: false }
	const currentUser = options.user === undefined ? student : options.user
	const services = options.services ?? [service]

	await page.route('**/socket.io/**', route => route.abort())
	await page.route('**/api/v1/**', async route => {
		const request = route.request()
		const url = new URL(request.url())
		const path = url.pathname
		const method = request.method()

		if (path.endsWith('/auth/refresh')) {
			return currentUser
				? json(route, { user: currentUser, accessToken: 'access-token' })
				: json(route, { message: 'Unauthorized' }, 401)
		}
		if (path.endsWith('/auth/login') && method === 'POST') {
			return json(route, { user: student, accessToken: 'access-token' })
		}
		if (path.endsWith('/auth/register') && method === 'POST') {
			const payload = request.postDataJSON()
			return json(route, {
				user: { ...student, name: payload.name, email: payload.email },
				accessToken: 'access-token',
			})
		}
		if (path.endsWith('/auth/logout')) return json(route, { message: 'ok' })
		if (path.endsWith('/auth/oauth/providers')) return json(route, { google: false, yandex: false })
		if (path.endsWith('/auth/oauth/accounts')) return json(route, [])

		if (path.endsWith('/orders/my')) return json(route, [])
		if (path.endsWith('/orders') && method === 'POST') {
			state.createdOrder = request.postDataJSON()
			return json(
				route,
				{
					id: 'order-1',
					serviceId: service.id,
					packageId: state.createdOrder?.packageId,
					studentId: student.id,
					freelancerId: freelancer.id,
					status: 'PENDING',
					requirements: state.createdOrder?.requirements ?? null,
					totalPrice: 300000,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
					packageName: 'Базовый',
					packageDeliveryDays: 7,
					packageRevisions: 2,
					packageFeatures: [],
					service: { id: service.id, title: service.title, images: [] },
					package: service.packages[0],
					student,
					freelancer,
				},
				201,
			)
		}

		if (path.endsWith('/services/popular')) return json(route, { data: [] })
		if (path.endsWith('/services') && method === 'POST') {
			state.createdService = request.postDataJSON()
			return json(route, { ...service, ...state.createdService }, 201)
		}
		if (path.endsWith('/services')) {
			return json(route, {
				data: services,
				total: services.length,
				page: 1,
				limit: 12,
			})
		}
		if (path.endsWith(`/services/${service.id}`)) return json(route, service)
		if (path.includes('/reviews/service/')) {
			return json(route, { data: [], total: 0, page: 1, limit: 10 })
		}

		if (path.endsWith('/chat/conversations') && method === 'GET') {
			return json(route, [
				{
					id: 'conversation-1',
					partner: { id: freelancer.id, name: freelancer.name },
					lastMessage: null,
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
			])
		}
		if (path.endsWith('/chat/unread/counts')) return json(route, {})
		if (path.endsWith('/chat/conversations/conversation-1/read')) {
			return json(route, {})
		}
		if (path.endsWith('/chat/conversations/conversation-1/files')) {
			state.uploadedFile = true
			return json(route, {
				url: 'https://files.example/test.txt',
				name: 'test.txt',
				type: 'text/plain',
				size: 12,
			})
		}
		if (path.endsWith('/chat/conversations/conversation-1')) {
			if (method === 'GET') {
				return json(route, { data: [], total: 0, page: 1, limit: 200 })
			}
			if (method === 'POST') {
				state.sentMessage = request.postDataJSON()
				return json(route, {
					id: 'message-1',
					conversationId: 'conversation-1',
					senderId: currentUser?.id ?? student.id,
					...state.sentMessage,
					isRead: false,
					createdAt: new Date().toISOString(),
					sender: currentUser ?? student,
				})
			}
		}

		return json(route, {})
	})

	return state
}
