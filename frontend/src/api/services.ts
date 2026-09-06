import type {
	FreelancerProfile,
	PaginatedResponse,
	Service,
	ServiceCategory,
	ServiceFilters,
	ServiceLevel,
	ServicePackage,
} from '@/types'
import axios from 'axios'
import apiClient from './client'

// ─── Mappers (backend → frontend types) ─────────────────────────────────────

function mapCategory(cat: string): ServiceCategory {
	return cat.toLowerCase() as ServiceCategory
}

function mapLevel(lvl: string): ServiceLevel {
	return lvl.toLowerCase() as ServiceLevel
}

interface BackendPackage {
	id: string
	name: string
	price: number
	deliveryDays: number
	revisions?: number
	description?: string
	features?: string[]
}

interface BackendProfile {
	bio?: string
	rating?: number
	reviewsCount?: number
	completedOrders?: number
	specializations?: string[]
	isVerified?: boolean
	responseTime?: string
	location?: string
	telegram?: string
}

interface BackendUser {
	id: string
	email?: string
	name: string
	avatar?: string
	createdAt?: string
	profile?: BackendProfile | null
}

interface BackendService {
	id: string
	freelancerId: string
	freelancer?: BackendUser
	title: string
	description: string
	category: string
	level: string
	tags?: string[]
	packages?: BackendPackage[]
	thumbnail?: string
	images?: string[]
	rating?: number
	reviewsCount?: number
	ordersCount?: number
	isFeatured?: boolean
	createdAt: string
	updatedAt?: string
}

interface PopularServicesGroup {
	category: ServiceCategory
	services: Service[]
}

function mapPackage(pkg: BackendPackage): ServicePackage {
	return {
		id: pkg.id,
		name: pkg.name,
		price: Math.round(pkg.price / 100), // kopecks → rubles
		deliveryDays: pkg.deliveryDays,
		revisions: pkg.revisions ?? 1,
		description: pkg.description,
		features: pkg.features ?? [],
	}
}

function mapFreelancer(u: BackendUser): FreelancerProfile {
	const p: BackendProfile = u.profile ?? {}
	return {
		id: u.id,
		email: u.email ?? '',
		name: u.name,
		avatar: u.avatar,
		role: 'freelancer',
		bio: p.bio ?? '',
		rating: p.rating ?? 0,
		reviewsCount: p.reviewsCount ?? 0,
		completedOrders: p.completedOrders ?? 0,
		specializations: (p.specializations ?? []).map(s => s.toLowerCase()),
		isVerified: p.isVerified ?? false,
		responseTime: p.responseTime ?? '~24 часа',
		location: p.location,
		telegram: p.telegram,
		createdAt: u.createdAt ?? new Date().toISOString(),
	}
}

function mapService(s: BackendService): Service {
	const freelancerFallback: BackendUser = { id: s.freelancerId, name: '' }
	return {
		id: s.id,
		freelancerId: s.freelancerId,
		freelancer: mapFreelancer(s.freelancer ?? freelancerFallback),
		title: s.title,
		description: s.description,
		category: mapCategory(s.category),
		level: mapLevel(s.level),
		tags: s.tags ?? [],
		packages: (s.packages ?? []).map(mapPackage) as Service['packages'],
		thumbnail: s.thumbnail ?? s.images?.[0],
		rating: s.rating ?? 0,
		reviewsCount: s.reviewsCount ?? 0,
		ordersCount: s.ordersCount ?? 0,
		isFeatured: s.isFeatured ?? false,
		createdAt: s.createdAt,
		updatedAt: s.updatedAt ?? s.createdAt,
	}
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function getServices(
	filters: ServiceFilters = {},
): Promise<PaginatedResponse<Service>> {
	const params: Record<string, unknown> = {}
	if (filters.category) params.category = filters.category.toUpperCase()
	if (filters.level) params.level = filters.level.toUpperCase()
	if (filters.freelancerId) params.freelancerId = filters.freelancerId
	if (filters.search) params.search = filters.search
	if (filters.page) params.page = filters.page
	if (filters.limit) params.limit = filters.limit
	if (filters.sort === 'rating') params.sort = 'rating'

	const { data } = await apiClient.get('/v1/services', { params })
	const mapped = (data.data ?? []).map(mapService)
	return {
		data: mapped,
		total: data.total ?? mapped.length,
		page: data.page ?? 1,
		limit: data.limit ?? 12,
		totalPages: Math.ceil((data.total ?? mapped.length) / (data.limit ?? 12)),
	}
}

export async function getServiceById(id: string): Promise<Service | null> {
	try {
		const { data } = await apiClient.get(`/v1/services/${id}`)
		return mapService(data)
	} catch (err) {
		if (axios.isAxiosError(err) && err.response?.status === 404) return null
		throw err
	}
}

export async function getFeaturedServices(): Promise<Service[]> {
	const { data } = await apiClient.get('/v1/services', {
		params: { limit: 4, page: 1, isFeatured: true },
	})
	return (data.data ?? []).map(mapService)
}

export async function getPopularServicesByCategory(
	limit = 3,
): Promise<PopularServicesGroup[]> {
	const { data } = await apiClient.get('/v1/services/popular', {
		params: { limit },
	})
	return (data.data ?? []).map(
		(group: { category: string; services: BackendService[] }) => ({
			category: mapCategory(group.category),
			services: (group.services ?? []).map(mapService),
		}),
	)
}

export async function getFreelancerById(
	id: string,
): Promise<FreelancerProfile | null> {
	try {
		const { data } = await apiClient.get(`/v1/users/${id}`)
		return mapFreelancer(data)
	} catch (err) {
		if (axios.isAxiosError(err) && err.response?.status === 404) return null
		throw err
	}
}

export async function getFreelancers(
	page = 1,
	limit = 4,
): Promise<PaginatedResponse<FreelancerProfile>> {
	const { data } = await apiClient.get('/v1/users/freelancers', {
		params: { page, limit },
	})
	const mapped = (data.data ?? []).map(mapFreelancer)
	return {
		data: mapped,
		total: data.total ?? mapped.length,
		page: data.page ?? page,
		limit: data.limit ?? limit,
		totalPages: Math.ceil((data.total ?? mapped.length) / limit),
	}
}

// ─── My services (freelancer) ────────────────────────────────────────────────

export async function getMyServices(freelancerId: string): Promise<Service[]> {
	const { data } = await apiClient.get('/v1/services', {
		params: { freelancerId, limit: 100 },
	})
	return (data.data ?? []).map(mapService)
}

export interface CreateServicePayload {
	title: string
	description: string
	category: string // uppercase, e.g. 'MATHEMATICS'
	level: string // uppercase, e.g. 'BACHELOR'
	tags?: string[]
	packages: {
		name: string
		price: number // in kopecks
		deliveryDays: number
		revisions?: number
		description?: string
		features?: string[]
	}[]
}

export async function createService(
	payload: CreateServicePayload,
): Promise<Service> {
	const { data } = await apiClient.post<BackendService>('/v1/services', payload)
	return mapService(data)
}

export interface UpdateServicePayload {
	title?: string
	description?: string
	category?: string // uppercase, e.g. 'MATHEMATICS'
	level?: string // uppercase, e.g. 'BACHELOR'
	tags?: string[]
	packages?: {
		id?: string
		name: string
		price: number // in kopecks
		deliveryDays: number
		revisions?: number
		description?: string
		features?: string[]
	}[]
}

export async function updateService(
	id: string,
	payload: UpdateServicePayload,
): Promise<Service> {
	const { data } = await apiClient.patch<BackendService>(
		`/v1/services/${id}`,
		payload,
	)
	return mapService(data)
}

export async function deleteService(id: string): Promise<void> {
	await apiClient.delete(`/v1/services/${id}`)
}
