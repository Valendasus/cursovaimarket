import { useAuthStore } from '@/store/authStore'
import axios from 'axios'

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 15000,
})

// Request interceptor — attach auth token
apiClient.interceptors.request.use(config => {
	const token = useAuthStore.getState().token
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// Response interceptor — handle 401
apiClient.interceptors.response.use(
	response => response,
	error => {
		if (error.response?.status === 401) {
			useAuthStore.getState().logout()
			window.location.href = '/login'
		}
		return Promise.reject(error)
	},
)

export default apiClient
