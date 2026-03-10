import { logoutApi } from '@/api/auth'
import type { AuthState, User } from '@/types'
import { create } from 'zustand'

interface AuthStore extends AuthState {
	setUser: (user: User, accessToken: string) => void
	clearUser: () => void
	logout: () => void
	updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(set => ({
	user: null,
	token: null,
	isAuthenticated: false,

	setUser: (user, accessToken) =>
		set({ user, token: accessToken, isAuthenticated: true }),

	clearUser: () =>
		set({ user: null, token: null, isAuthenticated: false }),

	logout: () => {
		void logoutApi() // clears httpOnly cookie on server
		set({ user: null, token: null, isAuthenticated: false })
	},

	updateUser: updates =>
		set(state => ({
			user: state.user ? { ...state.user, ...updates } : null,
		})),
}))
