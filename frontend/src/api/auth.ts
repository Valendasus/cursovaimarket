import type { FreelancerProfile, User, UserRole } from '@/types'
import apiClient from './client'

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendUser {
	id: string
	email: string
	name: string
	avatar?: string
	role: 'STUDENT' | 'FREELANCER' | 'ADMIN'
	createdAt: string
	profile?: {
		bio: string
		rating: number
		reviewsCount: number
		completedOrders: number
		specializations: string[]
		isVerified: boolean
		responseTime: string
		telegram?: string
		location?: string
	} | null
}

interface AuthResponse {
	user: BackendUser
	accessToken: string
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapUser(u: BackendUser): User | FreelancerProfile {
	const role = u.role.toLowerCase() as UserRole
	const base: User = {
		id: u.id,
		email: u.email,
		name: u.name,
		avatar: u.avatar,
		role,
		createdAt: u.createdAt,
	}

	if (role === 'freelancer' && u.profile) {
		return {
			...base,
			role: 'freelancer',
			bio: u.profile.bio ?? '',
			rating: u.profile.rating ?? 0,
			reviewsCount: u.profile.reviewsCount ?? 0,
			completedOrders: u.profile.completedOrders ?? 0,
			specializations: u.profile.specializations ?? [],
			isVerified: u.profile.isVerified ?? false,
			responseTime: u.profile.responseTime ?? '~24 часа',
			location: u.profile.location,
                        telegram: u.profile.telegram,
	})
	return { user: mapUser(data.user), accessToken: data.accessToken }
}

export async function registerApi(
	name: string,
	email: string,
	password: string,
	role: 'STUDENT' | 'FREELANCER',
) {
	const { data } = await apiClient.post<AuthResponse>('/v1/auth/register', {
		name,
		email,
		password,
		role,
	})
	return { user: mapUser(data.user), accessToken: data.accessToken }
}

/** Refresh access token using httpOnly refresh_token cookie */
export async function refreshApi() {
	const { data } = await apiClient.post<AuthResponse>('/v1/auth/refresh')
	return { user: mapUser(data.user), accessToken: data.accessToken }
}

export async function logoutApi() {
	await apiClient.post('/v1/auth/logout').catch(() => {})
}

export async function updateMeApi(data: { name?: string; avatar?: string }) {
	const { data: res } = await apiClient.patch<BackendUser>('/v1/users/me', data)
	return mapUser(res)
}

export async function updateProfileApi(data: {
	bio?: string
	telegram?: string
	specializations?: string[]
}) {
	await apiClient.patch('/v1/users/me/profile', data)
}

export async function getMeApi() {
	const { data } = await apiClient.get<BackendUser>('/v1/auth/me')
	return mapUser(data)
}

export async function switchRoleApi(role: 'STUDENT' | 'FREELANCER') {
	const { data: res } = await apiClient.patch<BackendUser>(
		'/v1/users/me/role',
		{ role },
	)
	return mapUser(res)
}
