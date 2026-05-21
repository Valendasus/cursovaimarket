import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import axios from 'axios'

const RAW_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const NORMALIZED_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '')
const BASE_URL = NORMALIZED_BASE_URL.endsWith('/api')
	? NORMALIZED_BASE_URL
	: `${NORMALIZED_BASE_URL}/api`

export const apiClient = axios.create({
	baseURL: BASE_URL,
	headers: { 'Content-Type': 'application/json' },
	withCredentials: true, // send httpOnly refresh_token cookie
	timeout: 15000,
})

// Bare client for /refresh — same withCredentials, no interceptors
const refreshClient = axios.create({
	baseURL: BASE_URL,
	withCredentials: true,
	timeout: 10000,
})

// Attach access token from memory store
apiClient.interceptors.request.use(config => {
	const token = useAuthStore.getState().token
	if (token) config.headers.Authorization = `Bearer ${token}`
	return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(token: string) {
	refreshQueue.forEach(resolve => resolve(token))
	refreshQueue = []
}

// On 401 — silently refresh via cookie, retry once
apiClient.interceptors.response.use(
	response => response,
	async error => {
		const originalRequest = error.config
		const status = error.response?.status as number | undefined

		const isAuthRoute =
			originalRequest?.url?.includes('/auth/refresh') ||
			originalRequest?.url?.includes('/auth/login') ||
			originalRequest?.url?.includes('/auth/register')

		if (status === 401 && !originalRequest._retry && !isAuthRoute) {
			if (isRefreshing) {
				return new Promise<string>(resolve => {
					refreshQueue.push(resolve)
				}).then(token => {
					originalRequest.headers.Authorization = `Bearer ${token}`
					return apiClient(originalRequest)
				})
			}

			originalRequest._retry = true
			isRefreshing = true

			try {
				const { data } = await refreshClient.post<{
					user: unknown
					accessToken: string
				}>('/v1/auth/refresh')

				const newToken = data.accessToken
				const { mapUser } = await import('./auth')
				const user = mapUser(data.user as Parameters<typeof mapUser>[0])
				useAuthStore.getState().setUser(user as User, newToken)

				processQueue(newToken)
				originalRequest.headers.Authorization = `Bearer ${newToken}`
				return apiClient(originalRequest)
			} catch {
				useAuthStore.getState().clearUser()
				window.location.href = '/login'
				return Promise.reject(error)
			} finally {
				isRefreshing = false
			}
		}

		return Promise.reject(error)
	},
)

export default apiClient

export function extractApiError(
	err: unknown,
	fallback = 'Произошла ошибка',
): string {
	const raw = (err as { response?: { data?: { message?: unknown } } })?.response
		?.data?.message
	if (typeof raw === 'string') return raw
	if (Array.isArray(raw)) return raw.filter(Boolean).join(', ') || fallback
	return fallback
}
