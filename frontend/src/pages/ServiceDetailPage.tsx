import { getServiceById } from '@/api/services'
import { formatPrice } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
	ArrowLeft,
	CheckCircle,
	Clock,
	MessageSquare,
	Shield,
	Star,
} from 'lucide-react'

export default function ServiceDetailPage() {
	const { serviceId } = useParams({ strict: false }) as { serviceId: string }
	const { isAuthenticated } = useAuthStore()

	const {
		data: service,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['service', serviceId],
		queryFn: () => getServiceById(serviceId),
		enabled: !!serviceId,
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

	const pkg = service.packages[0]

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
					{/* Left */}
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

						{/* Thumbnail */}
						{service.thumbnail && (
							<div className='aspect-video rounded-2xl overflow-hidden bg-muted'>
								<img
									src={service.thumbnail}
									alt={service.title}
									className='w-full h-full object-cover'
								/>
							</div>
						)}

						{/* Description */}
						<div className='glass-card rounded-2xl p-6'>
							<h2 className='font-semibold text-foreground mb-3'>Описание</h2>
							<p className='text-muted-foreground leading-relaxed whitespace-pre-line'>
								{service.description}
							</p>
						</div>

						{/* Tags */}
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

						{/* Freelancer */}
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
					</motion.div>

					{/* Right: Pricing card */}
					<motion.aside
						initial={{ opacity: 0, x: 16 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.1 }}
						className='space-y-4 lg:sticky lg:top-24 h-fit'
					>
						<div className='glass-card rounded-2xl p-6'>
							<div className='flex items-baseline justify-between mb-4'>
								<span className='text-3xl font-bold text-foreground'>
									{formatPrice(pkg?.price ?? service.packages[0].price)}
								</span>
								<span className='text-sm text-muted-foreground'>за работу</span>
							</div>

							{pkg && (
								<div className='space-y-2 mb-6'>
									{pkg.features.map(feat => (
										<div
											key={feat}
											className='flex items-start gap-2 text-sm text-muted-foreground'
										>
											<CheckCircle className='w-4 h-4 text-green-500 shrink-0 mt-0.5' />
											{feat}
										</div>
									))}
									<div className='flex items-center gap-2 text-sm text-muted-foreground'>
										<Clock className='w-4 h-4 text-primary shrink-0' />
										Срок: {pkg.deliveryDays} дней
									</div>
								</div>
							)}

							{isAuthenticated ? (
								<button className='w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors'>
									Заказать
								</button>
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
