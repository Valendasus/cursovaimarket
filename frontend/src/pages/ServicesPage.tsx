import { getServices } from '@/api/services'
import ServiceCard from '@/features/services/ServiceCard'
import {
	SERVICE_CATEGORIES,
	SERVICE_LEVELS,
	type ServiceCategory,
	type ServiceLevel,
} from '@/types'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

const LEVEL_OPTIONS: { value: ServiceLevel | 'all'; label: string }[] = [
	{ value: 'all', label: 'Все уровни' },
	{ value: 'bachelor', label: SERVICE_LEVELS.bachelor },
	{ value: 'specialist', label: SERVICE_LEVELS.specialist },
	{ value: 'master', label: SERVICE_LEVELS.master },
]

export default function ServicesPage() {
	const [search, setSearch] = useState('')
	const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'all'>(
		'all',
	)
	const [activeLevel, setActiveLevel] = useState<ServiceLevel | 'all'>('all')
	const [showFilters, setShowFilters] = useState(true)

	const { data, isLoading } = useQuery({
		queryKey: ['services', activeCategory, activeLevel],
		queryFn: () =>
			getServices({
				category:
					activeCategory === 'all'
						? undefined
						: (activeCategory as ServiceCategory),
				level: activeLevel === 'all' ? undefined : activeLevel,
			}),
	})

	const filtered = (data?.data ?? []).filter(
		s =>
			s.title.toLowerCase().includes(search.toLowerCase()) ||
			s.description.toLowerCase().includes(search.toLowerCase()),
	)

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
							onChange={e => setSearch(e.target.value)}
							placeholder='Поиск услуг...'
							className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
						/>
						{search && (
							<button
								onClick={() => setSearch('')}
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
									onClick={() => setActiveCategory('all')}
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
										onClick={() => setActiveCategory(value)}
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
										onClick={() => setActiveLevel(opt.value)}
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
						) : filtered.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-20 text-muted-foreground'>
								<Search className='w-12 h-12 opacity-20 mb-3' />
								<p>Услуги не найдены</p>
							</div>
						) : (
							<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
								{filtered.map((service, i) => (
									<ServiceCard key={service.id} service={service} index={i} />
								))}
							</div>
						)}

						{!isLoading && (
							<p className='text-sm text-muted-foreground mt-4'>
								Найдено: {filtered.length} услуг
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
