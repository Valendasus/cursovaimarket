import { createOrder } from '@/api/orders'
import { getServiceById } from '@/api/services'
import ReviewsSection from '@/features/reviews/ReviewsSection'
import { formatPrice } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ArrowLeft,
	CheckCircle,
	Clock,
	MessageSquare,
	RotateCcw,
	Shield,
	ShoppingBag,
	Star,
} from 'lucide-react'
import { useState } from 'react'

export default function ServiceDetailPage() {
	const { serviceId } = useParams({ strict: false }) as { serviceId: string }
	const { isAuthenticated, user } = useAuthStore()
	const [selectedPkgIdx, setSelectedPkgIdx] = useState(0)
	const [requirements, setRequirements] = useState('')
	const [showOrderForm, setShowOrderForm] = useState(false)
	const [orderSuccess, setOrderSuccess] = useState(false)

	const {
		data: service,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['service', serviceId],
		queryFn: () => getServiceById(serviceId),
		enabled: !!serviceId,
	})

	const {
		mutate: placeOrder,
		isPending: ordering,
		error: orderError,
	} = useMutation({
		mutationFn: (pkgId: string) =>
			createOrder(pkgId, requirements.trim() || undefined),
		onSuccess: () => {
			setOrderSuccess(true)
			setShowOrderForm(false)
		},
	})

	if (isLoading) {
		return (
			<div className='min-h-screen bg-background container-custom py-10'>
				<div className='grid lg:grid-cols-[1fr_360px] gap-8'>
					<div className='space-y-4'>
						<div className='h-8 w-3/4 bg-muted/50 rounded-xl animate-pulse' />
						<div className='h-48 bg-muted/50 rounded-2xl animate-pulse' />
						<div className='h-32 bg-muted/50 rounded-2xl animate-pulse' />
					</div>
					<div className='h-96 bg-muted/50 rounded-2xl animate-pulse' />
				</div>
			</div>
		)
	}

	if (error || !service) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<p className='text-muted-foreground mb-4'>Услуга не найдена</p>
					<Link to='/services' className='text-primary hover:underline text-sm'>
						← Все услуги
					</Link>
				</div>
			</div>
		)
	}

	const selectedPkg = service.packages[selectedPkgIdx] ?? service.packages[0]
	const isOwnService = user?.id === service.freelancerId
	const isFreelancer = user?.role === 'freelancer'

	return (
		<div className='min-h-screen bg-background'>
			<div className='container-custom py-10'>
				<Link
					to='/services'
					className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors'
				>
					<ArrowLeft className='w-4 h-4' />
					Все услуги
				</Link>

				<div className='grid lg:grid-cols-[1fr_360px] gap-8'>
					{/* Left column */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						className='space-y-6'
					>
						<div>
							<div className='flex flex-wrap gap-2 mb-3'>
								<span className='text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium'>
									{service.category}
								</span>
								<span className='text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground'>
									{service.level}
								</span>
							</div>
							<h1 className='text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3'>
								{service.title}
							</h1>
							<div className='flex items-center gap-4 text-sm text-muted-foreground'>
								<span className='flex items-center gap-1'>
									<Star className='w-4 h-4 text-yellow-400 fill-yellow-400' />
									{service.rating.toFixed(1)} ({service.reviewsCount} отзывов)
								</span>
								<span className='flex items-center gap-1'>
									<CheckCircle className='w-4 h-4 text-green-500' />
									{service.ordersCount} выполнено
								</span>
							</div>
						</div>

						{service.thumbnail && (
							<div className='aspect-video rounded-2xl overflow-hidden bg-muted'>
								<img
									src={service.thumbnail}
									alt={service.title}
									className='w-full h-full object-cover'
								/>
							</div>
						)}

						<div className='glass-card rounded-2xl p-6'>
							<h2 className='font-semibold text-foreground mb-3'>Описание</h2>
							<p className='text-muted-foreground leading-relaxed whitespace-pre-line'>
								{service.description}
							</p>
						</div>

						{service.packages.length > 0 && (
							<div className='glass-card rounded-2xl p-6'>
								<h2 className='font-semibold text-foreground mb-4'>Пакеты</h2>
								<div className='grid sm:grid-cols-3 gap-3'>
									{service.packages.map((pkg, i) => (
										<button
											key={pkg.id}
											onClick={() => setSelectedPkgIdx(i)}
											className={`text-left p-4 rounded-xl border transition-all ${
												selectedPkgIdx === i
													? 'border-primary bg-primary/5'
													: 'border-border hover:border-primary/40 hover:bg-muted/30'
											}`}
										>
											<p className='font-medium text-foreground text-sm mb-1'>
												{pkg.name}
											</p>
											<p className='text-lg font-bold text-foreground mb-2'>
												{formatPrice(pkg.price)}
											</p>
											<p className='text-xs text-muted-foreground flex items-center gap-1'>
												<Clock className='w-3 h-3' />
												{pkg.deliveryDays} дней
											</p>
											{pkg.revisions !== undefined && (
												<p className='text-xs text-muted-foreground flex items-center gap-1 mt-1'>
													<RotateCcw className='w-3 h-3' />
													{pkg.revisions === -1
														? '∞ правок'
														: `${pkg.revisions} правки`}
												</p>
											)}
										</button>
									))}
								</div>
								{selectedPkg?.features && selectedPkg.features.length > 0 && (
									<ul className='mt-4 space-y-1.5'>
										{selectedPkg.features.map(f => (
											<li
												key={f}
												className='flex items-start gap-2 text-sm text-muted-foreground'
											>
												<CheckCircle className='w-4 h-4 text-green-500 shrink-0 mt-0.5' />
												{f}
											</li>
										))}
									</ul>
								)}
							</div>
						)}

						{service.tags.length > 0 && (
							<div className='glass-card rounded-2xl p-6'>
								<h2 className='font-semibold text-foreground mb-3'>Теги</h2>
								<div className='flex flex-wrap gap-2'>
									{service.tags.map(tag => (
										<span
											key={tag}
											className='text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground'
										>
											#{tag}
										</span>
									))}
								</div>
							</div>
						)}

						<div className='glass-card rounded-2xl p-6'>
							<h2 className='font-semibold text-foreground mb-4'>
								Об исполнителе
							</h2>
							<Link
								to='/freelancers/$freelancerId'
								params={{ freelancerId: service.freelancerId }}
								className='flex items-center gap-4 hover:opacity-80 transition-opacity'
							>
								<div className='w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden'>
									{service.freelancer.avatar ? (
										<img
											src={service.freelancer.avatar}
											alt={service.freelancer.name}
											className='w-full h-full object-cover'
										/>
									) : (
										service.freelancer.name.charAt(0)
									)}
								</div>
								<div>
									<p className='font-medium text-foreground'>
										{service.freelancer.name}
									</p>
									<p className='text-sm text-muted-foreground'>
										Просмотреть профиль →
									</p>
								</div>
							</Link>
						</div>

						<ReviewsSection
							serviceId={serviceId}
							isAuthenticated={isAuthenticated}
							isStudent={user?.role === 'student'}
							isOwnService={isOwnService}
						/>
					</motion.div>

					{/* Right: Order card */}
					<motion.aside
						initial={{ opacity: 0, x: 16 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.1 }}
						className='space-y-4 lg:sticky lg:top-24 h-fit'
					>
						<AnimatePresence>
							{orderSuccess && (
								<motion.div
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.95 }}
									className='glass-card rounded-2xl p-6 border border-green-500/30 bg-green-500/5'
								>
									<div className='flex items-center gap-3 mb-3'>
										<CheckCircle className='w-6 h-6 text-green-500' />
										<h3 className='font-semibold text-foreground'>
											Заказ размещён!
										</h3>
									</div>
									<p className='text-sm text-muted-foreground mb-4'>
										Исполнитель получит уведомление и приступит к работе.
									</p>
									<Link
										to='/dashboard'
										className='flex items-center gap-2 text-sm font-medium text-primary hover:underline'
									>
										<ShoppingBag className='w-4 h-4' />
										Мои заказы →
									</Link>
								</motion.div>
							)}
						</AnimatePresence>

						<div className='glass-card rounded-2xl p-6'>
							<div className='flex items-baseline justify-between mb-1'>
								<span className='text-3xl font-bold text-foreground'>
									{formatPrice(selectedPkg?.price ?? 0)}
								</span>
								<span className='text-sm text-muted-foreground'>за работу</span>
							</div>
							{selectedPkg && (
								<p className='text-sm text-muted-foreground mb-4'>
									Пакет «{selectedPkg.name}» · {selectedPkg.deliveryDays} дней
								</p>
							)}

							<AnimatePresence>
								{showOrderForm && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										className='overflow-hidden'
									>
										<div className='mb-4'>
											<label className='block text-sm font-medium text-foreground mb-1.5'>
												Требования к заказу
											</label>
											<textarea
												id='order-requirements'
												name='requirements'
												value={requirements}
												onChange={e => setRequirements(e.target.value)}
												placeholder='Опишите тему, особые пожелания, дедлайн...'
												rows={4}
												className='w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none'
											/>
										</div>
									</motion.div>
								)}
							</AnimatePresence>

							{orderError && (
								<p className='text-xs text-destructive mb-3'>
									{(
										orderError as { response?: { data?: { message?: string } } }
									)?.response?.data?.message ?? 'Ошибка при создании заказа'}
								</p>
							)}

							{isOwnService ? (
								<p className='text-sm text-muted-foreground text-center py-2'>
									Это ваша услуга
								</p>
							) : isAuthenticated && isFreelancer ? (
								<p className='text-sm text-muted-foreground text-center py-2'>
									Фрилансеры не могут оформлять заказы
								</p>
							) : isAuthenticated ? (
								<>
									{!showOrderForm ? (
										<button
											onClick={() => setShowOrderForm(true)}
											className='w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors'
										>
											Заказать
										</button>
									) : (
										<div className='flex gap-2'>
											<button
												onClick={() => {
													if (selectedPkg) placeOrder(selectedPkg.id)
												}}
												disabled={ordering}
												className='flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60'
											>
												{ordering ? 'Оформляем...' : 'Подтвердить заказ'}
											</button>
											<button
												onClick={() => setShowOrderForm(false)}
												className='px-4 py-3 rounded-xl border border-border text-sm hover:bg-muted transition-colors'
											>
												✕
											</button>
										</div>
									)}
								</>
							) : (
								<Link
									to='/login'
									className='block text-center w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors'
								>
									Войти для заказа
								</Link>
							)}

							<button className='w-full mt-3 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2'>
								<MessageSquare className='w-4 h-4' />
								Написать исполнителю
							</button>

							<div className='flex items-center gap-2 mt-4 text-xs text-muted-foreground justify-center'>
								<Shield className='w-3.5 h-3.5' />
								Защищённая оплата через платформу
							</div>
						</div>
					</motion.aside>
				</div>
			</div>
		</div>
	)
}
