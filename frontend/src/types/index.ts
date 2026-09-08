// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'freelancer' | 'admin'

export interface User {
	id: string
	email: string
	name: string
	avatar?: string
	role: UserRole
	emailVerified?: boolean
	bio?: string
	telegram?: string
	createdAt: string
}

export interface FreelancerProfile extends User {
	role: 'freelancer'
	bio: string
	rating: number
	reviewsCount: number
	completedOrders: number
	specializations: string[]
	isVerified: boolean
	responseTime: string // e.g. "~2 часа"
	location?: string
	telegram?: string
}

export interface AuthState {
	user: User | null
	token: string | null
	isAuthenticated: boolean
}

// ─── Services (Услуги) ───────────────────────────────────────────────────────

export type ServiceCategory =
	| 'mathematics'
	| 'economics'
	| 'informatics'
	| 'law'
	| 'history'
	| 'psychology'
	| 'physics'
	| 'chemistry'
	| 'biology'
	| 'engineering'
	| 'management'
	| 'other'

export type ServiceLevel = 'bachelor' | 'specialist' | 'master'

export type DeliveryPeriod = '1-3' | '3-7' | '7-14' | '14-30'

export interface ServicePackage {
	id: string
	name: string // Базовый / Стандарт / Премиум
	price: number
	deliveryDays: number
	revisions: number
	description?: string
	features: string[]
}

export interface Service {
	id: string
	freelancerId: string
	freelancer: FreelancerProfile
	title: string
	description: string
	category: ServiceCategory
	level: ServiceLevel
	tags: string[]
	packages: [ServicePackage, ServicePackage, ServicePackage] // 3 packages
	thumbnail?: string
	rating: number
	reviewsCount: number
	ordersCount: number
	isFeatured: boolean
	createdAt: string
	updatedAt: string
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
	| 'pending'
	| 'awaiting_payment'
	| 'accepted'
	| 'in_progress'
	| 'review'
	| 'revision'
	| 'completed'
	| 'cancelled'

export interface Order {
	id: string
	serviceId: string
	service: Service
	buyerId: string
	buyer: User
	freelancerId: string
	freelancer: FreelancerProfile
	packageId: string
	package: ServicePackage
	status: OrderStatus
	requirements: string
	deadline: string
	totalPrice: number
	createdAt: string
	updatedAt: string
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
	id: string
	serviceId: string
	orderId: string
	authorId: string
	author: User
	rating: number
	comment: string
	createdAt: string
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface ApiError {
	message: string
	status: number
	errors?: Record<string, string[]>
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface ServiceFilters {
	category?: ServiceCategory
	level?: ServiceLevel
	minPrice?: number
	maxPrice?: number
	minRating?: number
	search?: string
	sort?: 'rating' | 'price_asc' | 'price_desc' | 'newest' | 'popular'
	page?: number
	limit?: number
	freelancerId?: string
}

// ─── UI ──────────────────────────────────────────────────────────────────────

export const SERVICE_CATEGORIES: Record<ServiceCategory, string> = {
	mathematics: 'Математика',
	economics: 'Экономика',
	informatics: 'Информатика',
	law: 'Юриспруденция',
	history: 'История',
	psychology: 'Психология',
	physics: 'Физика',
	chemistry: 'Химия',
	biology: 'Биология',
	engineering: 'Инженерия',
	management: 'Менеджмент',
	other: 'Другое',
}

export const SERVICE_LEVELS: Record<ServiceLevel, string> = {
	bachelor: 'Бакалавриат',
	specialist: 'Специалитет',
	master: 'Магистратура',
}
