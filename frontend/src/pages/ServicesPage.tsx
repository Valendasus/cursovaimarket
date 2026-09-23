import { getServices } from '@/api/services'
import StatePanel from '@/components/common/StatePanel'
import ServiceCard from '@/features/services/ServiceCard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
	SERVICE_CATEGORIES,
	SERVICE_LEVELS,
	type ServiceCategory,
	type ServiceLevel,
} from '@/types'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

const LIMIT = 12

const LEVEL_OPTIONS: { value: ServiceLevel | 'all'; label: string }[] = [
	{ value: 'all', label: 'Все уровни' },
	{ value: 'bachelor', label: SERVICE_LEVELS.bachelor },
	{ value: 'specialist', label: SERVICE_LEVELS.specialist },
	{ value: 'master', label: SERVICE_LEVELS.master },
]

export default function ServicesPage() {
	const [search, setSearch] = useState('')
	const { category } = useSearch({ from: '/services' })
	const navigate = useNavigate({ from: '/services' })
	const activeCategory = category ?? 'all'
	const setActiveCategory = (value: ServiceCategory | 'all') => {
		void navigate({
			search: { category: value === 'all' ? undefined : value },
			resetScroll: false,
		})
	}
	const [activeLevel, setActiveLevel] = useState<ServiceLevel | 'all'>('all')
	const [showFilters, setShowFilters] = useState(true)
	const [page, setPage] = useState(1)
	const debouncedSearch = useDebouncedValue(search.trim(), 300)

	const { data, isLoading, isError, isFetching, refetch } = useQuery({
		queryKey: [
			'services',
			activeCategory,
			activeLevel,
			debouncedSearch,
			page,
		],
		queryFn: () =>
			getServices({
				category:
					activeCategory === 'all'
						? undefined
						: (activeCategory as ServiceCategory),
				level: activeLevel === 'all' ? undefined : activeLevel,
				search: debouncedSearch || undefined,
				page,
				limit: LIMIT,
			}),
		placeholderData: prev => prev,
	})

	const services = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = data?.totalPages ?? 0

	const topByCategory = services.reduce<
		Partial<Record<ServiceCategory, string>>
	>((acc, service) => {
		const currentId = acc[service.category]
		if (!currentId) {
			acc[service.category] = service.id
			return acc
		}
		const current = services.find(item => item.id === currentId)
		if (!current || service.ordersCount > current.ordersCount) {
			acc[service.category] = service.id
		}
		return acc
	}, {})

	return (
		<div className='min-h-screen bg-background'>
			<div className='container-custom py-10'>
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					className='mb-8'
				>
					<h1 className='text-3xl font-bold text-foreground mb-2'>
						Все услуги
					</h1>
					<p className='text-muted-foreground'>
						Найдите опытного исполнителя для вашей работы
					</p>
				</motion.div>

				{/* Search bar */}
				<div className='flex gap-3 mb-6'>
					<div className='relative flex-1'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
						<input
							id='service-search'
							name='search'
							value={search}
							onChange={e => {
								setSearch(e.target.value)
								setPage(1)
							}}
							placeholder='Поиск услуг...'
							className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
						/>
						{search && (
							<button
								onClick={() => {
									setSearch('')
									setPage(1)
								}}
								className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
							>
								<X className='w-4 h-4' />
							</button>
						)}
					</div>
					<button
						onClick={() => setShowFilters(v => !v)}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
							showFilters
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border text-foreground hover:bg-muted'
						}`}
					>
						<SlidersHorizontal className='w-4 h-4' />
						Фильтры
					</button>
				</div>

				<div
					className={`grid gap-6 ${showFilters ? 'lg:grid-cols-[240px_1fr]' : ''}`}
				>
					{/* Filters sidebar */}
					<motion.aside
						initial={false}
						animate={{
							opacity: showFilters ? 1 : 0,
							width: showFilters ? 'auto' : 0,
						}}
						className={`space-y-6 overflow-hidden ${showFilters ? 'block' : 'hidden'}`}
					>
						<div className='glass-card rounded-2xl p-5'>
							<h3 className='font-semibold text-foreground mb-3'>Категория</h3>
							<div className='space-y-1'>
								<button
									aria-pressed={activeCategory === 'all'}
									onClick={() => {
										setActiveCategory('all')
										setPage(1)
									}}
									className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
										activeCategory === 'all'
											? 'bg-primary text-primary-foreground'
											: 'text-muted-foreground hover:text-foreground hover:bg-muted'
									}`}
								>
									Все категории
								</button>
								{(
									Object.entries(SERVICE_CATEGORIES) as [
										ServiceCategory,
										string,
									][]
								).map(([value, label]) => (
									<button
										key={value}
										aria-pressed={activeCategory === value}
										onClick={() => {
											setActiveCategory(value)
											setPage(1)
										}}
										className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
											activeCategory === value
												? 'bg-primary text-primary-foreground'
												: 'text-muted-foreground hover:text-foreground hover:bg-muted'
										}`}
									>
										{label}
									</button>
								))}
							</div>
						</div>

						<div className='glass-card rounded-2xl p-5'>
							<h3 className='font-semibold text-foreground mb-3'>Уровень</h3>
							<div className='space-y-1'>
								{LEVEL_OPTIONS.map(opt => (
									<button
										key={opt.value}
										onClick={() => {
											setActiveLevel(opt.value)
											setPage(1)
										}}
										className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
											activeLevel === opt.value
												? 'bg-primary text-primary-foreground'
												: 'text-muted-foreground hover:text-foreground hover:bg-muted'
										}`}
									>
										{opt.label}
									</button>
								))}
							</div>
						</div>
					</motion.aside>

					{/* Grid */}
					<div>
						{isLoading ? (
							<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
								{Array.from({ length: 6 }).map((_, i) => (
									<div
										key={i}
										className='h-64 rounded-2xl bg-muted/50 animate-pulse'
									/>
								))}
							</div>
						) : isError ? (
							<StatePanel
								title='Не удалось загрузить услуги'
								description='Проверьте подключение и повторите запрос. Выбранные фильтры сохранятся.'
								onRetry={() => void refetch()}
								retrying={isFetching}
								link={{ label: 'Нужна помощь', to: '/support' }}
							/>
						) : services.length === 0 ? (
							<StatePanel
								variant='empty'
								title='Услуги не найдены'
								description='Попробуйте изменить запрос, категорию или уровень работы.'
							/>
						) : (
							<div
								className={`grid sm:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}
							>
								{services.map((service, i) => (
									<ServiceCard
										key={service.id}
										service={service}
										index={i}
										showTopBadge={
											topByCategory[service.category] === service.id
										}
									/>
								))}
							</div>
						)}

						{!isLoading && !isError && (
							<p className='text-sm text-muted-foreground mt-4'>
								Найдено: {total} услуг
							</p>
						)}

						{totalPages > 1 && (
							<div className='flex justify-center items-center gap-2 mt-8'>
								<button
									onClick={() => setPage(p => Math.max(1, p - 1))}
									disabled={page === 1}
									className='w-9 h-9 rounded-xl text-sm font-medium bg-muted text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors'
								>
									←
								</button>
								{(() => {
									const range: (number | '...')[] = []
									let previous = 0
									for (let current = 1; current <= totalPages; current++) {
										if (
											current === 1 ||
											current === totalPages ||
											(current >= page - 2 && current <= page + 2)
										) {
											if (previous && current - previous > 1) range.push('...')
											range.push(current)
											previous = current
										}
									}
									return range.map((item, index) =>
										item === '...' ? (
											<span
												key={`ellipsis-${index}`}
												className='w-9 h-9 flex items-center justify-center text-muted-foreground text-sm'
											>
												···
											</span>
										) : (
											<button
												key={item}
												onClick={() => setPage(item)}
												className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
													item === page
														? 'bg-primary text-primary-foreground'
														: 'bg-muted text-foreground hover:bg-muted/70'
												}`}
											>
												{item}
											</button>
										),
									)
								})()}
								<button
									onClick={() => setPage(p => Math.min(totalPages, p + 1))}
									disabled={page >= totalPages}
									className='w-9 h-9 rounded-xl text-sm font-medium bg-muted text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors'
								>
									→
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
