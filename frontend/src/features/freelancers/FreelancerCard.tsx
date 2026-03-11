import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { FreelancerProfile } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, MessageCircle, Star } from 'lucide-react'

interface FreelancerCardProps {
	freelancer: FreelancerProfile
	index?: number
}

export default function FreelancerCard({
	freelancer,
	index = 0,
}: FreelancerCardProps) {
	const { user } = useAuthStore()
	const navigate = useNavigate()
	const isOwnCard = user?.id === freelancer.id

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: index * 0.07 }}
		>
			<div
				className='block group cursor-pointer'
				onClick={() =>
					navigate({
						to: '/freelancers/$freelancerId',
						params: { freelancerId: freelancer.id },
					})
				}
			>
				<div className='rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300'>
					{/* Header */}
					<div className='flex items-start gap-4 mb-4'>
						<div className='relative'>
							<Avatar className='h-14 w-14'>
								<AvatarImage src={freelancer.avatar} alt={freelancer.name} />
								<AvatarFallback className='bg-primary/10 text-primary font-semibold text-lg'>
									{getInitials(freelancer.name)}
								</AvatarFallback>
							</Avatar>
							{freelancer.isVerified && (
								<div className='absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 border-2 border-background'>
									<CheckCircle className='h-3 w-3 text-white' />
								</div>
							)}
						</div>
						<div className='flex-1 min-w-0'>
							<h3 className='font-semibold text-foreground group-hover:text-primary transition-colors truncate'>
								{freelancer.name}
							</h3>
							{freelancer.location && (
								<p className='text-xs text-muted-foreground mt-0.5'>
									{freelancer.location}
								</p>
							)}
							<div className='flex items-center gap-1 mt-1'>
								<Star className='h-3.5 w-3.5 fill-gold-400 text-gold-400' />
								<span className='text-sm font-bold'>
									{freelancer.rating.toFixed(1)}
								</span>
								<span className='text-xs text-muted-foreground'>
									({freelancer.reviewsCount} отзывов)
								</span>
							</div>
						</div>
					</div>

					{/* Bio */}
					<p className='text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed'>
						{freelancer.bio}
					</p>

					{/* Specializations */}
					<div className='flex flex-wrap gap-1.5 mb-4'>
						{freelancer.specializations.slice(0, 3).map(spec => (
							<Badge key={spec} variant='secondary' className='text-xs'>
								{SERVICE_CATEGORIES[spec as keyof typeof SERVICE_CATEGORIES] ||
									spec}
							</Badge>
						))}
					</div>

					{/* Stats */}
					<div className='grid grid-cols-2 gap-3 mb-4 py-3 border-y border-border'>
						<div className='text-center'>
							<p className='text-lg font-bold text-foreground'>
								{freelancer.completedOrders}
							</p>
							<p className='text-xs text-muted-foreground'>заказов</p>
						</div>
						<div className='text-center'>
							<div className='flex items-center justify-center gap-1'>
								<Clock className='h-3.5 w-3.5 text-muted-foreground' />
								<p className='text-lg font-bold text-foreground'>
									{freelancer.responseTime}
								</p>
							</div>
							<p className='text-xs text-muted-foreground'>ответ</p>
						</div>
					</div>

					{/* CTA */}
					<div className='flex gap-2'>
						<Button size='sm' className='flex-1' asChild>
							<Link
								to='/freelancers/$freelancerId'
								params={{ freelancerId: freelancer.id }}
								onClick={e => e.stopPropagation()}
							>
								Услуги
							</Link>
						</Button>
						{!isOwnCard && (
							<Button
								size='sm'
								variant='outline'
								className='flex items-center gap-1'
								asChild
							>
								<Link
									to='/dashboard'
									search={{ tab: 'messages', partnerId: freelancer.id }}
									onClick={e => e.stopPropagation()}
								>
									<MessageCircle className='h-3.5 w-3.5' />
									Чат
								</Link>
							</Button>
						)}
					</div>
				</div>
			</div>
		</motion.div>
	)
}
