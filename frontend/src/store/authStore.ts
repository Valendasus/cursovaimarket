import { logoutApi } from '@/api/auth'
import type { AuthState, User } from '@/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore extends AuthState {
	refreshToken: string | null
	setUser: (user: User, accessToken: string, refreshToken?: string) => void
	logout: () => void
	updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(
	persist(
		set => ({
			user: null,
			token: null,
			refreshToken: null,
			isAuthenticated: false,

			setUser: (user, accessToken, refreshToken) => {
				set({
					user,
					token: accessToken,
					refreshToken: refreshToken ?? null,
					isAuthenticated: true,
				})
			},

			logout: () => {
				logoutApi()
				set({
					user: null,
					token: null,
					refreshToken: null,
					isAuthenticated: false,
				})
			},

			updateUser: updates => {
				set(state => ({
					user: state.user ? { ...state.user, ...updates } : null,
				}))
			},
		}),
		{
			name: 'cursovai-auth',
		},
	),
)
