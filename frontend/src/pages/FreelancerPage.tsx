import { getFreelancerById, getServices } from '@/api/services'
import ServiceCard from '@/features/services/ServiceCard'
import { getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Clock, MapPin, Send, Star } from 'lucide-react'

export default function FreelancerPage() {
	const { freelancerId } = useParams({ strict: false }) as {
		freelancerId: string
	}

	const { data: freelancer, isLoading: loadingFreelancer } = useQuery({
		queryKey: ['freelancer', freelancerId],
		queryFn: () => getFreelancerById(freelancerId),
		enabled: !!freelancerId,
	})

	const { data: servicesData, isLoading: loadingServices } = useQuery({
		queryKey: ['freelancer-services', freelancerId],
		queryFn: () => getServices({ freelancerId }),
		enabled: !!freelancerId,
	})

	if (loadingFreelancer) {
		return (
			<div className='min-h-screen bg-background container-custom py-10'>
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
			<div className='container-custom py-10'>
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
							<p className='text-sm text-muted-foreground mt-1'>
								{freelancer.specializations.join(' · ')}
							</p>

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

							{freelancer.telegram && (
								<a
									href={`https://t.me/${freelancer.telegram.replace('@', '')}`}
									target='_blank'
									rel='noopener noreferrer'
									className='w-full mt-5 py-2.5 rounded-xl bg-[#229ED9] text-white text-sm font-medium hover:bg-[#1a8bc4] transition-colors flex items-center justify-center gap-2'
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
									Срок: от {freelancer.responseTime}
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
											{spec}
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
						) : freelancerServices.length === 0 ? (
							<p className='text-muted-foreground'>
								У этого исполнителя пока нет услуг
							</p>
						) : (
							<div className='grid sm:grid-cols-2 gap-4'>
								{freelancerServices.map((service, i) => (
									<ServiceCard key={service.id} service={service} index={i} />
								))}
							</div>
						)}
					</motion.div>
				</div>
			</div>
		</div>
	)
}
