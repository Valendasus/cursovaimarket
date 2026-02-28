import type { AuthState, User } from '@/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore extends AuthState {
	setUser: (user: User, token: string) => void
	logout: () => void
	updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(
	persist(
		set => ({
			user: null,
			token: null,
			isAuthenticated: false,

			setUser: (user, token) => {
				set({ user, token, isAuthenticated: true })
			},

			logout: () => {
				set({ user: null, token: null, isAuthenticated: false })
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
