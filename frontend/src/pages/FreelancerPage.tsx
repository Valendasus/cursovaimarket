import { getFreelancerById, getServices } from '@/api/services'
import StatePanel from '@/components/common/StatePanel'
import ServiceCard from '@/features/services/ServiceCard'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
	ArrowLeft,
	CheckCircle,
	Clock,
	MapPin,
	MessageSquare,
	Send,
	Star,
} from 'lucide-react'

export default function FreelancerPage() {
	const { freelancerId } = useParams({ from: '/freelancers/$freelancerId' })
	const { user } = useAuthStore()

	const {
		data: freelancer,
		isLoading: loadingFreelancer,
		isError: freelancerError,
		isFetching: freelancerFetching,
		refetch: refetchFreelancer,
	} = useQuery({
		queryKey: ['freelancer', freelancerId],
		queryFn: () => getFreelancerById(freelancerId),
		enabled: !!freelancerId,
	})

	const {
		data: servicesData,
		isLoading: loadingServices,
		isError: servicesError,
		isFetching: servicesFetching,
		refetch: refetchServices,
	} = useQuery({
		queryKey: ['freelancer-services', freelancerId],
		queryFn: () => getServices({ freelancerId, limit: 100 }),
		enabled: !!freelancerId,
	})

	if (loadingFreelancer) {
		return (
			<div className='min-h-screen bg-background container-custom pt-24 pb-10'>
				<div className='h-64 bg-muted/50 rounded-2xl animate-pulse mb-6' />
				<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className='h-56 bg-muted/50 rounded-2xl animate-pulse'
						/>
					))}
				</div>
			</div>
		)
	}

	if (freelancerError) {
		return (
			<div className='container-custom min-h-screen py-20'>
				<StatePanel
					title='Не удалось загрузить профиль'
					description='Проверьте соединение и повторите попытку.'
					onRetry={() => void refetchFreelancer()}
					retrying={freelancerFetching}
					link={{ label: 'Все услуги', to: '/services' }}
				/>
			</div>
		)
	}

	if (!freelancer) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<p className='text-muted-foreground mb-4'>Исполнитель не найден</p>
					<Link to='/services' className='text-primary hover:underline text-sm'>
						← Все услуги
					</Link>
				</div>
			</div>
		)
	}

	const freelancerServices = servicesData?.data ?? []

	return (
		<div className='min-h-screen bg-background'>
			<div className='container-custom pt-24 pb-10'>
				<Link
					to='/services'
					className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors'
				>
					<ArrowLeft className='w-4 h-4' />
					Все услуги
				</Link>

				<div className='grid lg:grid-cols-[320px_1fr] gap-8'>
					{/* Profile card */}
					<motion.aside
						initial={{ opacity: 0, x: -16 }}
						animate={{ opacity: 1, x: 0 }}
						className='h-fit space-y-4 lg:sticky lg:top-24'
					>
						<div className='glass-card rounded-2xl p-6 text-center'>
							<div className='w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mx-auto mb-4 overflow-hidden'>
								{freelancer.avatar ? (
									<img
										src={freelancer.avatar}
										alt={freelancer.name}
										className='w-full h-full object-cover'
									/>
								) : (
									getInitials(freelancer.name)
								)}
							</div>
							<h1 className='text-xl font-bold text-foreground'>
								{freelancer.name}
							</h1>

							<div className='flex justify-center gap-4 mt-4 text-sm'>
								<div className='flex flex-col items-center'>
									<span className='flex items-center gap-1 font-semibold text-foreground'>
										<Star className='w-4 h-4 text-yellow-400 fill-yellow-400' />
										{freelancer.rating.toFixed(1)}
									</span>
									<span className='text-xs text-muted-foreground'>Рейтинг</span>
								</div>
								<div className='flex flex-col items-center'>
									<span className='font-semibold text-foreground'>
										{freelancer.completedOrders}
									</span>
									<span className='text-xs text-muted-foreground'>Заказов</span>
								</div>
							</div>

							{user?.id !== freelancer.id && (
								<Link
									to='/dashboard'
									search={{ tab: 'messages', partnerId: freelancer.id }}
									className='w-full mt-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-secondary'
								>
									<MessageSquare className='w-4 h-4' />
									Написать
								</Link>
							)}
							{user?.id !== freelancer.id && freelancer.telegram && (
								<a
									href={`https://t.me/${freelancer.telegram.replace(/^@/, '')}`}
									target='_blank'
									rel='noopener noreferrer'
									className='w-full mt-2 py-2.5 rounded-xl bg-[#229ED9] text-white text-sm font-medium hover:bg-[#1a8bc4] transition-colors flex items-center justify-center gap-2'
								>
									<Send className='w-4 h-4' />
									Написать в Telegram
								</a>
							)}
						</div>

						<div className='glass-card rounded-2xl p-5'>
							<h3 className='font-semibold text-foreground mb-3'>Информация</h3>
							<div className='space-y-3 text-sm'>
								{freelancer.location && (
									<div className='flex items-center gap-2 text-muted-foreground'>
										<MapPin className='w-4 h-4 shrink-0' />
										{freelancer.location}
									</div>
								)}
								<div className='flex items-center gap-2 text-muted-foreground'>
									<Clock className='w-4 h-4 shrink-0' />
									Время ответа: {freelancer.responseTime}
								</div>
								{freelancer.isVerified && (
									<div className='flex items-center gap-2 text-muted-foreground'>
										<CheckCircle className='w-4 h-4 shrink-0 text-green-500' />
										Аккаунт верифицирован
									</div>
								)}
							</div>
						</div>

						{freelancer.specializations.length > 0 && (
							<div className='glass-card rounded-2xl p-5'>
								<h3 className='font-semibold text-foreground mb-3'>
									Специализации
								</h3>
								<div className='flex flex-wrap gap-2'>
									{freelancer.specializations.map(spec => (
										<span
											key={spec}
											className='text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground'
										>
											{SERVICE_CATEGORIES[
												spec as keyof typeof SERVICE_CATEGORIES
											] || spec}
										</span>
									))}
								</div>
							</div>
						)}

						<div className='glass-card rounded-2xl p-5'>
							<h3 className='font-semibold text-foreground mb-1'>Отзывы</h3>
							<p className='text-2xl font-bold text-foreground'>
								{freelancer.reviewsCount}
							</p>
							<p className='text-xs text-muted-foreground'>всего отзывов</p>
						</div>
					</motion.aside>

					{/* Services */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
					>
						{freelancer.bio && (
							<div className='glass-card rounded-2xl p-6 mb-6'>
								<h2 className='font-semibold text-foreground mb-3'>О себе</h2>
								<p className='text-muted-foreground leading-relaxed'>
									{freelancer.bio}
								</p>
							</div>
						)}

						<h2 className='text-xl font-bold text-foreground mb-4'>Услуги</h2>
						{loadingServices ? (
							<div className='grid sm:grid-cols-2 gap-4'>
								{Array.from({ length: 2 }).map((_, i) => (
									<div
										key={i}
										className='h-56 bg-muted/50 rounded-2xl animate-pulse'
									/>
								))}
							</div>
						) : servicesError ? (
							<StatePanel
								compact
								title='Не удалось загрузить услуги исполнителя'
								description='Профиль доступен, но список услуг временно не загрузился.'
								onRetry={() => void refetchServices()}
								retrying={servicesFetching}
							/>
						) : freelancerServices.length === 0 ? (
							<p className='text-muted-foreground'>
								У этого исполнителя пока нет услуг
							</p>
						) : (
							<div className='grid sm:grid-cols-2 gap-4'>
								{(() => {
									const topByCategory = freelancerServices.reduce<
										Partial<Record<ServiceCategory, string>>
									>((acc, service) => {
										const currentId = acc[service.category]
										if (!currentId) {
											acc[service.category] = service.id
											return acc
										}
										const current = freelancerServices.find(
											item => item.id === currentId,
										)
										if (!current || service.ordersCount > current.ordersCount) {
											acc[service.category] = service.id
										}
										return acc
									}, {})

									return freelancerServices.map((service, i) => (
										<ServiceCard
											key={service.id}
											service={service}
											index={i}
											showTopBadge={
												topByCategory[service.category] === service.id
											}
										/>
									))
								})()}
							</div>
						)}
					</motion.div>
				</div>
			</div>
		</div>
	)
}
