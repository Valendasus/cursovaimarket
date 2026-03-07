import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const apiClient = axios.create({
	baseURL: BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 15000,
})

// Bare axios instance for refresh calls (bypasses interceptors to avoid loops)
const refreshClient = axios.create({ baseURL: BASE_URL, timeout: 10000 })

// Request interceptor — attach auth token
apiClient.interceptors.request.use(config => {
	const token = useAuthStore.getState().token
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// Response interceptor — auto-refresh on 401, then retry once
apiClient.interceptors.response.use(
	response => response,
	async error => {
		const originalRequest = error.config
		const status = error.response?.status

		// Skip retry if: not 401, already retried, or it's an auth route itself
		const isAuthRoute =
			originalRequest?.url?.includes('/auth/login') ||
			originalRequest?.url?.includes('/auth/register') ||
			originalRequest?.url?.includes('/auth/refresh')

		if (status === 401 && !originalRequest._retry && !isAuthRoute) {
			originalRequest._retry = true

			const { refreshToken, setUser, logout } = useAuthStore.getState()

			if (refreshToken) {
				try {
					const { data } = await refreshClient.post('/v1/auth/refresh', {
						refreshToken,
					})
					const newAccessToken: string = data.accessToken
					const newRefreshToken: string = data.refreshToken

					// Dynamically import mapUser to avoid circular dep
					const { mapUser } = await import('./auth')
					const user = mapUser(data.user)
					setUser(user as any, newAccessToken, newRefreshToken)

					// Retry original request with new token
					originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
					return apiClient(originalRequest)
				} catch {
					logout()
					window.location.href = '/login'
					return Promise.reject(error)
				}
			}

			logout()
			window.location.href = '/login'
		}

		return Promise.reject(error)
	},
)

export default apiClient

/** Extract a human-readable error message from an Axios error response. */
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
