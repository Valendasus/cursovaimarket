import { getFeaturedServices, getFreelancers } from '@/api/services'
import FreelancerCard from '@/features/freelancers/FreelancerCard'
import ServiceCard from '@/features/services/ServiceCard'
import { SERVICE_CATEGORIES } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
	ArrowRight,
	BookOpen,
	CheckCircle,
	Shield,
	Star,
	TrendingUp,
	Users,
	Zap,
} from 'lucide-react'
import { useRef } from 'react'
import { useInView } from 'react-intersection-observer'

// ─── Animation helpers ─────────────────────────────────────────────────────────
const fadeUp = {
	hidden: { opacity: 0, y: 32 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
}

function Section({
	children,
	className = '',
}: {
	children: React.ReactNode
	className?: string
}) {
	const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
	return (
		<motion.div
			ref={ref}
			variants={fadeUp}
			initial='hidden'
			animate={inView ? 'visible' : 'hidden'}
			className={className}
		>
			{children}
		</motion.div>
	)
}

// ─── Stats data ────────────────────────────────────────────────────────────────
const stats = [
	{ icon: Users, value: '1 200+', label: 'Исполнителей' },
	{ icon: BookOpen, value: '8 500+', label: 'Выполненных работ' },
	{ icon: Star, value: '4.9', label: 'Средняя оценка' },
	{ icon: TrendingUp, value: '98%', label: 'Довольных заказчиков' },
]

// ─── Steps ─────────────────────────────────────────────────────────────────────
const steps = [
	{
		num: '01',
		title: 'Опишите задачу',
		description: 'Укажите тему, объём, требования вуза и желаемые сроки',
	},
	{
		num: '02',
		title: 'Выберите исполнителя',
		description: 'Просмотрите профили, отзывы и портфолио авторов',
	},
	{
		num: '03',
		title: 'Получите результат',
		description: 'Исполнитель пришлёт работу, вы проверите и примете её',
	},
]

export default function HomePage() {
	const heroRef = useRef<HTMLDivElement>(null)
	const { scrollYProgress } = useScroll({
		target: heroRef,
		offset: ['start start', 'end start'],
	})
	const heroY = useTransform(scrollYProgress, [0, 1], [0, 60])
	const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

	const { data } = useQuery({
		queryKey: ['featured-services'],
		queryFn: getFeaturedServices,
	})

	const { data: freelancersData } = useQuery({
		queryKey: ['top-freelancers'],
		queryFn: () => getFreelancers(1, 4),
	})

	const featured = data ?? []
	const topFreelancers = freelancersData?.data ?? []

	return (
		<div className='overflow-x-hidden'>
			{/* ── Hero ──────────────────────────────────────────────────────────────── */}
			<section
				ref={heroRef}
				className='relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5'
			>
				{/* Decorative blobs */}
				<div className='absolute inset-0 pointer-events-none'>
					<div className='absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl' />
					<div className='absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-brand-gold/10 blur-3xl' />
				</div>

				<motion.div
					style={{ y: heroY, opacity: heroOpacity }}
					className='container-custom relative z-10 py-24'
				>
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7 }}
						className='max-w-3xl'
					>
						<motion.span
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.1, duration: 0.4 }}
							className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6'
						>
							<Zap className='w-4 h-4' />
							Маркетплейс курсовых работ №1
						</motion.span>

						<h1 className='text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground mb-6'>
							Найдите <span className='text-gradient'>идеального</span>{' '}
							исполнителя для вашей работы
						</h1>

						<p className='text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed'>
							Более 1 200 проверенных авторов готовы помочь с курсовыми,
							дипломными и другими учебными работами. Качество гарантируем.
						</p>

						<div className='flex flex-col sm:flex-row gap-4'>
							<Link
								to='/services'
								className='inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]'
							>
								Найти исполнителя
								<ArrowRight className='w-4 h-4' />
							</Link>
							<Link
								to='/register'
								className='inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold text-base hover:bg-muted transition-all hover:scale-[1.02]'
							>
								Стать исполнителем
							</Link>
						</div>

						{/* Trust icons */}
						<div className='flex flex-wrap items-center gap-6 mt-10 text-sm text-muted-foreground'>
							{[
								{ icon: Shield, text: 'Защита платежей' },
								{ icon: CheckCircle, text: 'Проверенные авторы' },
								{ icon: Star, text: 'Гарантия качества' },
							].map(({ icon: Icon, text }) => (
								<span key={text} className='flex items-center gap-1.5'>
									<Icon className='w-4 h-4 text-primary' />
									{text}
								</span>
							))}
						</div>
					</motion.div>
				</motion.div>

				{/* Scroll indicator */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.2 }}
					className='absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1'
				>
					<motion.div
						animate={{ y: [0, 8, 0] }}
						transition={{ repeat: Infinity, duration: 1.6 }}
						className='w-1 h-6 rounded-full bg-muted-foreground/40'
					/>
				</motion.div>
			</section>

			{/* ── Stats ─────────────────────────────────────────────────────────────── */}
			<section className='border-y border-border bg-muted/30 py-12'>
				<div className='container-custom'>
					<div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
						{stats.map(({ icon: Icon, value, label }, i) => (
							<motion.div
								key={label}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.1 }}
								className='text-center'
							>
								<div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3'>
									<Icon className='w-5 h-5 text-primary' />
								</div>
								<p className='text-2xl font-bold text-foreground'>{value}</p>
								<p className='text-sm text-muted-foreground'>{label}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ── Categories ────────────────────────────────────────────────────────── */}
			<section className='py-16 container-custom'>
				<Section>
					<div className='text-center mb-10'>
						<h2 className='text-2xl md:text-3xl font-bold text-foreground mb-2'>
							Категории услуг
						</h2>
						<p className='text-muted-foreground'>Выберите нужное направление</p>
					</div>
					<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
						{(Object.entries(SERVICE_CATEGORIES) as [string, string][])
							.slice(0, 10)
							.map(([value, label]) => (
								<Link
									key={value}
									to='/services'
									className='flex flex-col items-center gap-2 p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group text-center'
								>
									<span className='text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight'>
										{label}
									</span>
								</Link>
							))}
					</div>
				</Section>
			</section>

			{/* ── Featured Services ─────────────────────────────────────────────────── */}
			<section className='py-16 bg-muted/30'>
				<div className='container-custom'>
					<Section>
						<div className='flex items-end justify-between mb-8'>
							<div>
								<h2 className='text-2xl md:text-3xl font-bold text-foreground mb-1'>
									Популярные услуги
								</h2>
								<p className='text-muted-foreground'>Топ работ этой недели</p>
							</div>
							<Link
								to='/services'
								className='hidden sm:flex items-center gap-1 text-sm text-primary hover:underline font-medium'
							>
								Все услуги <ArrowRight className='w-4 h-4' />
							</Link>
						</div>
					</Section>

					{featured.length > 0 ? (
						<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
							{featured.map((service, i) => (
								<ServiceCard key={service.id} service={service} index={i} />
							))}
						</div>
					) : (
						<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									key={i}
									className='h-64 bg-muted/50 rounded-2xl animate-pulse'
								/>
							))}
						</div>
					)}

					<div className='text-center mt-8 sm:hidden'>
						<Link
							to='/services'
							className='inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium'
						>
							Все услуги <ArrowRight className='w-4 h-4' />
						</Link>
					</div>
				</div>
			</section>

			{/* ── How it works ──────────────────────────────────────────────────────── */}
			<section className='py-20 container-custom'>
				<Section>
					<div className='text-center mb-12'>
						<h2 className='text-2xl md:text-3xl font-bold text-foreground mb-2'>
							Как это работает
						</h2>
						<p className='text-muted-foreground max-w-lg mx-auto'>
							Три простых шага — и ваша работа готова
						</p>
					</div>
					<div className='grid md:grid-cols-3 gap-6 max-w-3xl mx-auto'>
						{steps.map((step, i) => (
							<motion.div
								key={step.num}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.15 }}
								className='text-center'
							>
								<div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl mb-4'>
									{step.num}
								</div>
								<h3 className='font-semibold text-foreground mb-2'>
									{step.title}
								</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									{step.description}
								</p>
							</motion.div>
						))}
					</div>
				</Section>
			</section>

			{/* ── Top Freelancers ───────────────────────────────────────────────────── */}
			<section className='py-16 bg-muted/30'>
				<div className='container-custom'>
					<Section>
						<div className='flex items-end justify-between mb-8'>
							<div>
								<h2 className='text-2xl md:text-3xl font-bold text-foreground mb-1'>
									Лучшие исполнители
								</h2>
								<p className='text-muted-foreground'>
									Проверенные авторы с высоким рейтингом
								</p>
							</div>
						</div>
					</Section>
					<div className='grid sm:grid-cols-2 xl:grid-cols-4 gap-4'>
						{topFreelancers.map((fl, i) => (
							<FreelancerCard key={fl.id} freelancer={fl} index={i} />
						))}
					</div>
				</div>
			</section>

			{/* ── CTA ───────────────────────────────────────────────────────────────── */}
			<section className='py-20 container-custom'>
				<motion.div
					initial={{ opacity: 0, scale: 0.96 }}
					whileInView={{ opacity: 1, scale: 1 }}
					viewport={{ once: true }}
					className='relative rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-brand-gold/10 border border-primary/20 px-8 py-16 text-center overflow-hidden'
				>
					<div className='absolute inset-0 pointer-events-none'>
						<div className='absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/10 blur-3xl' />
						<div className='absolute bottom-0 left-0 w-48 h-48 rounded-full bg-brand-gold/10 blur-2xl' />
					</div>
					<div className='relative z-10 max-w-xl mx-auto'>
						<h2 className='text-2xl md:text-3xl font-bold text-foreground mb-4'>
							Готовы начать?
						</h2>
						<p className='text-muted-foreground mb-8 text-base leading-relaxed'>
							Зарегистрируйтесь бесплатно и найдите идеального исполнителя или
							начните зарабатывать на своих знаниях уже сегодня.
						</p>
						<div className='flex flex-col sm:flex-row gap-3 justify-center'>
							<Link
								to='/register'
								className='inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:scale-[1.02]'
							>
								Зарегистрироваться
								<ArrowRight className='w-4 h-4' />
							</Link>
							<Link
								to='/services'
								className='inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all'
							>
								Посмотреть услуги
							</Link>
						</div>
					</div>
				</motion.div>
			</section>
		</div>
	)
}
