import type {
	FreelancerProfile,
	PaginatedResponse,
	Service,
	ServiceCategory,
	ServiceFilters,
	ServiceLevel,
	ServicePackage,
} from '@/types'
import apiClient from './client'

// ─── Mock data (replace with real API calls) ──────────────────────────────────

export const mockFreelancers: FreelancerProfile[] = [
	{
		id: 'f1',
		email: 'ivan@example.com',
		name: 'Иван Петров',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ivan',
		role: 'freelancer',
		bio: 'Кандидат экономических наук. 7 лет пишу курсовые по экономике и менеджменту. Гарантирую уникальность и антиплагиат от 85%.',
		rating: 4.9,
		reviewsCount: 143,
		completedOrders: 189,
		specializations: ['economics', 'management'],
		isVerified: true,
		responseTime: '~1 час',
		location: 'Москва',
		createdAt: '2021-03-15T00:00:00.000Z',
	},
	{
		id: 'f2',
		email: 'maria@example.com',
		name: 'Мария Котова',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
		role: 'freelancer',
		bio: 'Программист с опытом в академическом письме. Специализируюсь на информатике, алгоритмах и ИИ.',
		rating: 4.8,
		reviewsCount: 97,
		completedOrders: 124,
		specializations: ['informatics'],
		isVerified: true,
		responseTime: '~2 часа',
		location: 'Санкт-Петербург',
		createdAt: '2022-01-10T00:00:00.000Z',
	},
	{
		id: 'f3',
		email: 'alex@example.com',
		name: 'Александр Новиков',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
		role: 'freelancer',
		bio: 'Юрист-практик. Пишу курсовые по всем отраслям права. Строгое соответствие актуальному законодательству.',
		rating: 4.7,
		reviewsCount: 68,
		completedOrders: 82,
		specializations: ['law'],
		isVerified: true,
		responseTime: '~3 часа',
		location: 'Екатеринбург',
		createdAt: '2022-06-20T00:00:00.000Z',
	},
	{
		id: 'f4',
		email: 'elena@example.com',
		name: 'Елена Смирнова',
		avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena',
		role: 'freelancer',
		bio: 'Математик, преподаватель вуза. Высшая математика, теория вероятностей, математическая статистика.',
		rating: 5.0,
		reviewsCount: 54,
		completedOrders: 61,
		specializations: ['mathematics', 'physics'],
		isVerified: true,
		responseTime: '~1 час',
		location: 'Новосибирск',
		createdAt: '2023-02-01T00:00:00.000Z',
	},
]

export const mockServices: Service[] = [
	{
		id: 's1',
		freelancerId: 'f1',
		freelancer: mockFreelancers[0],
		title: 'Напишу курсовую по экономике и финансам',
		description:
			'Профессиональное написание курсовых работ по экономике, финансам и менеджменту. Уникальность от 85%, список литературы, правильное оформление по ГОСТ.',
		category: 'economics',
		level: 'bachelor',
		tags: ['экономика', 'финансы', 'ГОСТ', 'антиплагиат'],
		packages: [
			{
				id: 'p1-1',
				name: 'Базовый',
				price: 3500,
				deliveryDays: 14,
				revisions: 1,
				features: ['До 30 страниц', 'Уникальность 80%+', '1 правка'],
			},
			{
				id: 'p1-2',
				name: 'Стандарт',
				price: 5500,
				deliveryDays: 10,
				revisions: 3,
				features: [
					'До 50 страниц',
					'Уникальность 85%+',
					'3 правки',
					'Презентация',
				],
			},
			{
				id: 'p1-3',
				name: 'Премиум',
				price: 8500,
				deliveryDays: 7,
				revisions: -1,
				features: [
					'До 70 страниц',
					'Уникальность 90%+',
					'Безлимит правок',
					'Презентация',
					'Доклад',
				],
			},
		],
		thumbnail:
			'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop',
		rating: 4.9,
		reviewsCount: 143,
		ordersCount: 189,
		isFeatured: true,
		createdAt: '2023-01-15T00:00:00.000Z',
		updatedAt: '2024-11-01T00:00:00.000Z',
	},
	{
		id: 's2',
		freelancerId: 'f2',
		freelancer: mockFreelancers[1],
		title: 'Курсовая по информатике, программированию и ИИ',
		description:
			'Курсовые работы по CS: алгоритмы, структуры данных, машинное обучение, веб-разработка, базы данных. Рабочий код в приложении.',
		category: 'informatics',
		level: 'bachelor',
		tags: ['программирование', 'алгоритмы', 'Python', 'ИИ'],
		packages: [
			{
				id: 'p2-1',
				name: 'Базовый',
				price: 4000,
				deliveryDays: 10,
				revisions: 1,
				features: ['Теоретическая часть', 'Базовый код', '1 правка'],
			},
			{
				id: 'p2-2',
				name: 'Стандарт',
				price: 7000,
				deliveryDays: 7,
				revisions: 3,
				features: [
					'Теория + практика',
					'Рабочий проект',
					'3 правки',
					'Документация',
				],
			},
			{
				id: 'p2-3',
				name: 'Премиум',
				price: 12000,
				deliveryDays: 5,
				revisions: -1,
				features: [
					'Полный проект',
					'Тесты',
					'Безлимит правок',
					'Защита помощь',
				],
			},
		],
		thumbnail:
			'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop',
		rating: 4.8,
		reviewsCount: 97,
		ordersCount: 124,
		isFeatured: true,
		createdAt: '2023-03-20T00:00:00.000Z',
		updatedAt: '2024-10-15T00:00:00.000Z',
	},
	{
		id: 's3',
		freelancerId: 'f3',
		freelancer: mockFreelancers[2],
		title: 'Профессиональные юридические курсовые работы',
		description:
			'Гражданское, уголовное, административное, трудовое право. Актуальная судебная практика, ссылки на нормативные акты.',
		category: 'law',
		level: 'bachelor',
		tags: ['право', 'юриспруденция', 'законодательство', 'судебная практика'],
		packages: [
			{
				id: 'p3-1',
				name: 'Базовый',
				price: 4500,
				deliveryDays: 14,
				revisions: 2,
				features: ['До 35 страниц', 'Актуальное законодательство', '2 правки'],
			},
			{
				id: 'p3-2',
				name: 'Стандарт',
				price: 7500,
				deliveryDays: 10,
				revisions: 4,
				features: ['До 55 страниц', 'Судебная практика', '4 правки', 'Доклад'],
			},
			{
				id: 'p3-3',
				name: 'Премиум',
				price: 11000,
				deliveryDays: 7,
				revisions: -1,
				features: [
					'До 80 страниц',
					'Полный пакет',
					'Безлимит правок',
					'Консультация',
				],
			},
		],
		thumbnail:
			'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?w=400&h=250&fit=crop',
		rating: 4.7,
		reviewsCount: 68,
		ordersCount: 82,
		isFeatured: false,
		createdAt: '2023-05-10T00:00:00.000Z',
		updatedAt: '2024-09-20T00:00:00.000Z',
	},
	{
		id: 's4',
		freelancerId: 'f4',
		freelancer: mockFreelancers[3],
		title: 'Курсовая по высшей математике и теорверу',
		description:
			'Высшая математика, математический анализ, теория вероятностей, математическая статистика, дискретная математика. Строгие доказательства.',
		category: 'mathematics',
		level: 'bachelor',
		tags: ['математика', 'теорвер', 'матанализ', 'статистика'],
		packages: [
			{
				id: 'p4-1',
				name: 'Базовый',
				price: 3000,
				deliveryDays: 7,
				revisions: 2,
				features: ['До 25 страниц', 'Строгие доказательства', '2 правки'],
			},
			{
				id: 'p4-2',
				name: 'Стандарт',
				price: 5000,
				deliveryDays: 5,
				revisions: 4,
				features: ['До 40 страниц', 'Подробные решения', '4 правки'],
			},
			{
				id: 'p4-3',
				name: 'Премиум',
				price: 8000,
				deliveryDays: 3,
				revisions: -1,
				features: [
					'До 60 страниц',
					'Максимальная детализация',
					'Безлимит правок',
					'Объяснение',
				],
			},
		],
		thumbnail:
			'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=250&fit=crop',
		rating: 5.0,
		reviewsCount: 54,
		ordersCount: 61,
		isFeatured: true,
		createdAt: '2023-08-01T00:00:00.000Z',
		updatedAt: '2024-11-05T00:00:00.000Z',
	},
	{
		id: 's5',
		freelancerId: 'f1',
		freelancer: mockFreelancers[0],
		title: 'Курсовая по менеджменту и управлению проектами',
		description:
			'Стратегический менеджмент, управление проектами, организационное поведение, HR-менеджмент. Реальные кейсы, SWOT-анализ.',
		category: 'management',
		level: 'master',
		tags: ['менеджмент', 'управление', 'стратегия', 'кейсы'],
		packages: [
			{
				id: 'p5-1',
				name: 'Базовый',
				price: 4000,
				deliveryDays: 14,
				revisions: 2,
				features: ['До 35 страниц', 'Кейс-анализ', '2 правки'],
			},
			{
				id: 'p5-2',
				name: 'Стандарт',
				price: 6500,
				deliveryDays: 10,
				revisions: 3,
				features: ['До 55 страниц', 'SWOT/PESTEL', '3 правки', 'Презентация'],
			},
			{
				id: 'p5-3',
				name: 'Премиум',
				price: 10000,
				deliveryDays: 7,
				revisions: -1,
				features: [
					'До 70 страниц',
					'Полный анализ',
					'Безлимит правок',
					'Защита',
				],
			},
		],
		thumbnail:
			'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
		rating: 4.9,
		reviewsCount: 78,
		ordersCount: 95,
		isFeatured: false,
		createdAt: '2023-04-05T00:00:00.000Z',
		updatedAt: '2024-10-30T00:00:00.000Z',
	},
	{
		id: 's6',
		freelancerId: 'f2',
		freelancer: mockFreelancers[1],
		title: 'Курсовая по анализу данных и Data Science',
		description:
			'Python, R, машинное обучение, визуализация данных, нейронные сети. Включает рабочий ноутбук с кодом и описание методологии.',
		category: 'informatics',
		level: 'master',
		tags: ['data science', 'Python', 'ML', 'анализ данных'],
		packages: [
			{
				id: 'p6-1',
				name: 'Базовый',
				price: 5000,
				deliveryDays: 10,
				revisions: 2,
				features: ['Теория + EDA', 'Jupyter notebook', '2 правки'],
			},
			{
				id: 'p6-2',
				name: 'Стандарт',
				price: 9000,
				deliveryDays: 7,
				revisions: 3,
				features: [
					'Полный ML pipeline',
					'Визуализации',
					'3 правки',
					'Документация',
				],
			},
			{
				id: 'p6-3',
				name: 'Премиум',
				price: 15000,
				deliveryDays: 5,
				revisions: -1,
				features: [
					'Полный проект',
					'Деплой',
					'Безлимит правок',
					'Консультация',
				],
			},
		],
		thumbnail:
			'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
		rating: 4.8,
		reviewsCount: 41,
		ordersCount: 53,
		isFeatured: true,
		createdAt: '2023-09-15T00:00:00.000Z',
		updatedAt: '2024-11-02T00:00:00.000Z',
	},
]

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

function mapPackage(pkg: BackendPackage): ServicePackage {
	return {
		id: pkg.id,
		name: pkg.name,
		price: Math.round(pkg.price / 100), // kopecks → rubles
		deliveryDays: pkg.deliveryDays,
		revisions: pkg.revisions ?? 1,
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
		specializations: p.specializations ?? [],
		isVerified: p.isVerified ?? false,
		responseTime: p.responseTime ?? '~24 часа',
		location: p.location,
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
	} catch {
		return null
	}
}

export async function getFeaturedServices(): Promise<Service[]> {
	const { data } = await apiClient.get('/v1/services', {
		params: { limit: 4, page: 1, isFeatured: true },
	})
	return (data.data ?? []).map(mapService)
}

export async function getFreelancerById(
	id: string,
): Promise<FreelancerProfile | null> {
	try {
		const { data } = await apiClient.get(`/v1/users/${id}`)
		return mapFreelancer(data)
	} catch {
		return null
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

export async function deleteService(id: string): Promise<void> {
	await apiClient.delete(`/v1/services/${id}`)
}
