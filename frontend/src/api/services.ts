import type {
	FreelancerProfile,
	PaginatedResponse,
	Service,
	ServiceFilters,
} from '@/types'

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

// ─── API functions ───────────────────────────────────────────────────────────

export async function getServices(
	filters: ServiceFilters = {},
): Promise<PaginatedResponse<Service>> {
	// TODO: replace with real API call
	await new Promise(r => setTimeout(r, 300)) // simulate latency

	let filtered = [...mockServices]

	if (filters.category) {
		filtered = filtered.filter(s => s.category === filters.category)
	}
	if (filters.freelancerId) {
		filtered = filtered.filter(s => s.freelancerId === filters.freelancerId)
	}
	if (filters.search) {
		const q = filters.search.toLowerCase()
		filtered = filtered.filter(
			s =>
				s.title.toLowerCase().includes(q) ||
				s.description.toLowerCase().includes(q) ||
				s.tags.some(t => t.toLowerCase().includes(q)),
		)
	}
	if (filters.minRating) {
		filtered = filtered.filter(s => s.rating >= filters.minRating!)
	}

	// Sort
	if (filters.sort === 'rating') {
		filtered.sort((a, b) => b.rating - a.rating)
	} else if (filters.sort === 'price_asc') {
		filtered.sort((a, b) => a.packages[0].price - b.packages[0].price)
	} else if (filters.sort === 'price_desc') {
		filtered.sort((a, b) => b.packages[0].price - a.packages[0].price)
	} else if (filters.sort === 'popular') {
		filtered.sort((a, b) => b.ordersCount - a.ordersCount)
	}

	const page = filters.page || 1
	const limit = filters.limit || 12
	const start = (page - 1) * limit
	const data = filtered.slice(start, start + limit)

	return {
		data,
		total: filtered.length,
		page,
		limit,
		totalPages: Math.ceil(filtered.length / limit),
	}
}

export async function getServiceById(id: string): Promise<Service | null> {
	await new Promise(r => setTimeout(r, 200))
	return mockServices.find(s => s.id === id) || null
}

export async function getFeaturedServices(): Promise<Service[]> {
	await new Promise(r => setTimeout(r, 200))
	return mockServices.filter(s => s.isFeatured).slice(0, 4)
}

export async function getFreelancerById(
	id: string,
): Promise<FreelancerProfile | null> {
	await new Promise(r => setTimeout(r, 200))
	const service = mockServices.find(s => s.freelancerId === id)
	return service?.freelancer || null
}
