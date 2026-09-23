import { beforeEach, describe, expect, it, vi } from 'vitest'

const { logoutApi } = vi.hoisted(() => ({
	logoutApi: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/auth', () => ({ logoutApi }))

import { useAuthStore } from './authStore'

const user = {
	id: 'u1',
	email: 'user@example.com',
	name: 'User',
	role: 'student' as const,
	createdAt: '2026-01-01T00:00:00.000Z',
}

describe('authStore', () => {
	beforeEach(() => {
		logoutApi.mockClear()
		useAuthStore.getState().clearUser()
	})

	it('sets and updates an authenticated user', () => {
		useAuthStore.getState().setUser(user, 'access-token')
		useAuthStore.getState().updateUser({ name: 'Updated' })

		expect(useAuthStore.getState()).toMatchObject({
			token: 'access-token',
			isAuthenticated: true,
			user: { id: 'u1', name: 'Updated' },
		})
	})

	it('clears local state and calls the server on logout', () => {
		useAuthStore.getState().setUser(user, 'access-token')
		useAuthStore.getState().logout()

		expect(logoutApi).toHaveBeenCalledOnce()
		expect(useAuthStore.getState()).toMatchObject({
			user: null,
			token: null,
			isAuthenticated: false,
		})
	})
})
