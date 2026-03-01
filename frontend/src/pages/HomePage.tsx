import { getFeaturedServices, getFreelancers } from '@/api/services'
import FreelancerCard from '@/features/freelancers/FreelancerCard'
import ServiceCard from '@/features/services/ServiceCard'
import { SERVICE_CATEGORIES } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
	ArrowRight,
	Award,
	BookOpen,
	CheckCircle,
	Clock,
	CreditCard,
	FileCheck,
	MessageSquare,
	RotateCcw,
	Search,
	Shield,
	Star,
	TrendingUp,
	Upload,
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

// ─── How it works data ─────────────────────────────────────────────────────────
const studentSteps = [
	{
		icon: Search,
		num: '01',
		title: 'Найдите услугу',
		description:
			'Введите тему или выберите категорию. Фильтры по дисциплине, уровню и бюджету помогут найти подходящего автора за минуты.',
		color: 'from-blue-500/20 to-blue-600/5',
		iconColor: 'text-blue-500',
		badge: 'Бесплатно',
	},
	{
		icon: MessageSquare,
		num: '02',
		title: 'Обсудите детали',
		description:
			'Изучите профиль исполнителя, его портфолио и отзывы. Выберите нужный пакет — базовый, стандартный или премиум.',
		color: 'from-violet-500/20 to-violet-600/5',
		iconColor: 'text-violet-500',
		badge: 'Гарантировано',
	},
	{
		icon: CreditCard,
		num: '03',
		title: 'Оплатите заказ',
		description:
			'Средства хранятся на безопасном счёте до принятия работы. Исполнитель получает оплату только после вашего одобрения.',
		color: 'from-emerald-500/20 to-emerald-600/5',
		iconColor: 'text-emerald-500',
		badge: 'Защита платежей',
	},
	{
		icon: FileCheck,
		num: '04',
		title: 'Получите результат',
		description:
			'Работа приходит в срок. Проверьте, при необходимости запросите правки — и примите заказ. Всё просто.',
		color: 'from-orange-500/20 to-orange-600/5',
		iconColor: 'text-orange-500',
		badge: 'В срок',
	},
]

const freelancerSteps = [
	{
		icon: Upload,
		num: '01',
		title: 'Создайте профиль',
		description:
			'Расскажите о своих компетенциях, загрузите примеры работ и пройдите верификацию — это бесплатно и займёт 10 минут.',
		color: 'from-pink-500/20 to-pink-600/5',
		iconColor: 'text-pink-500',
		badge: 'Без комиссии за регистрацию',
	},
	{
		icon: BookOpen,
		num: '02',
		title: 'Опубликуйте услугу',
		description:
			'Создайте карточку с описанием, пакетами цен и сроками. Сами определяете фиксированную стоимость своей работы.',
		color: 'from-cyan-500/20 to-cyan-600/5',
		iconColor: 'text-cyan-500',
		badge: 'Полный контроль цен',
	},
	{
		icon: Clock,
		num: '03',
		title: 'Выполните заказ',
		description:
			'Получайте заказы, общайтесь с заказчиком через встроенный чат и сдавайте работу через платформу — удобно и прозрачно.',
		color: 'from-amber-500/20 to-amber-600/5',
		iconColor: 'text-amber-500',
		badge: 'Встроенный чат',
	},
	{
		icon: Award,
		num: '04',
		title: 'Зарабатывайте и растите',
		description:
			'Получайте оплату сразу после принятия работы. Накапливайте отзывы, повышайте рейтинг и привлекайте больше клиентов.',
		color: 'from-lime-500/20 to-lime-600/5',
		iconColor: 'text-lime-600',
		badge: 'Выплата в день',
	},
]

const platformFeatures = [
	{
		icon: Shield,
		title: 'Защита платежей',
		desc: 'Деньги хранятся в безопасном резерве до принятия работы',
	},
	{
		icon: RotateCcw,
		title: 'Бесплатные правки',
		desc: 'Каждый пакет включает фиксированное число бесплатных доработок',
	},
	{
		icon: Star,
		title: 'Рейтинговая система',
		desc: 'Честные отзывы после каждого заказа — без накруток',
	},
	{
		icon: CheckCircle,
		title: 'Проверенные авторы',
		desc: 'Верификация специализации и проверка портфолио перед публикацией',
	},
	{
		icon: Clock,
		title: 'Гарантия сроков',
		desc: 'Исполнители несут ответственность за соблюдение дедлайна',
	},
	{
		icon: MessageSquare,
		title: 'Поддержка 24/7',
		desc: 'Команда КурсовогоМаркета готова помочь в любое время',
	},
]

export default function HomePage() {
	const heroRef = useRef<HTMLDivElement>(null)
	const [howTab, setHowTab] = useState<'student' | 'freelancer'>('student')
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
			<section id='how-it-works' className='py-20 bg-muted/20'>
				<div className='container-custom'>
					{/* Header */}
					<Section>
						<div className='text-center mb-10'>
							<motion.span
								initial={{ opacity: 0, scale: 0.9 }}
								whileInView={{ opacity: 1, scale: 1 }}
								viewport={{ once: true }}
								className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4'
							>
								<Zap className='w-3.5 h-3.5' />
								Просто и понятно
							</motion.span>
							<h2 className='text-2xl md:text-3xl font-bold text-foreground mb-3'>
								Как это работает
							</h2>
							<p className='text-muted-foreground max-w-md mx-auto text-sm leading-relaxed'>
								Платформа создана для удобства обеих сторон — заказчиков и
								исполнителей
							</p>
						</div>
					</Section>

					{/* Tab switcher */}
					<div className='flex justify-center mb-10'>
						<div className='inline-flex items-center gap-1 p-1 rounded-xl bg-muted border border-border'>
							{(['student', 'freelancer'] as const).map(tab => (
								<button
									key={tab}
									onClick={() => setHowTab(tab)}
									className={`relative px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
										howTab === tab
											? 'text-primary-foreground'
											: 'text-muted-foreground hover:text-foreground'
									}`}
								>
									{howTab === tab && (
										<motion.div
											layoutId='how-tab-bg'
											className='absolute inset-0 bg-primary rounded-lg shadow-sm'
											transition={{
												type: 'spring',
												stiffness: 400,
												damping: 30,
											}}
										/>
									)}
									<span className='relative z-10'>
										{tab === 'student' ? '👨‍🎓 Я заказчик' : '👩‍💻 Я исполнитель'}
									</span>
								</button>
							))}
						</div>
					</div>

					{/* Steps */}
					<AnimatePresence mode='wait'>
						<motion.div
							key={howTab}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -12 }}
							transition={{ duration: 0.3 }}
							className='grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-16'
						>
							{(howTab === 'student' ? studentSteps : freelancerSteps).map(
								(step, i) => (
									<motion.div
										key={step.num}
										initial={{ opacity: 0, y: 24 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.1 }}
										className='relative group rounded-2xl border border-border bg-background p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-300'
									>
										{/* connector line */}
										{i <
											(howTab === 'student' ? studentSteps : freelancerSteps)
												.length -
												1 && (
											<div className='hidden xl:block absolute top-10 -right-4 w-8 h-px bg-border z-10' />
										)}

										<div
											className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} mb-4 group-hover:scale-110 transition-transform duration-300`}
										>
											<step.icon className={`w-5 h-5 ${step.iconColor}`} />
										</div>

										<div className='flex items-center justify-between mb-2'>
											<span className='text-xs font-bold text-muted-foreground tracking-widest'>
												ШАГ {step.num}
											</span>
											<span className='text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium'>
												{step.badge}
											</span>
										</div>

										<h3 className='font-semibold text-foreground mb-2 text-base'>
											{step.title}
										</h3>
										<p className='text-sm text-muted-foreground leading-relaxed'>
											{step.description}
										</p>
									</motion.div>
								),
							)}
						</motion.div>
					</AnimatePresence>

					{/* Platform features */}
					<Section>
						<div className='rounded-3xl border border-border bg-background p-8'>
							<div className='text-center mb-8'>
								<h3 className='text-xl font-bold text-foreground mb-2'>
									Почему выбирают КурсовойМаркет
								</h3>
								<p className='text-sm text-muted-foreground max-w-sm mx-auto'>
									Мы сделали всё, чтобы сотрудничество было безопасным, удобным
									и выгодным
								</p>
							</div>
							<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-5'>
								{platformFeatures.map((feat, i) => (
									<motion.div
										key={feat.title}
										initial={{ opacity: 0, y: 16 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.07 }}
										className='flex gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors group'
									>
										<div className='flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors'>
											<feat.icon className='w-4 h-4 text-primary' />
										</div>
										<div>
											<p className='text-sm font-semibold text-foreground mb-0.5'>
												{feat.title}
											</p>
											<p className='text-xs text-muted-foreground leading-relaxed'>
												{feat.desc}
											</p>
										</div>
									</motion.div>
								))}
							</div>

							{/* CTA inside block */}
							<div className='mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4'>
								<p className='text-sm text-muted-foreground'>
									Готовы попробовать? Регистрация занимает менее 2 минут.
								</p>
								<Link
									to='/register'
									className='inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-md shadow-primary/20 flex-shrink-0'
								>
									Начать бесплатно
									<ArrowRight className='w-4 h-4' />
								</Link>
							</div>
						</div>
					</Section>
				</div>
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
