import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_THEME } from '@/lib/categoryTheme'
import { formatPrice, getInitials, truncate } from '@/lib/utils'
import type { Service } from '@/types'
import { SERVICE_CATEGORIES } from '@/types'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Clock, RotateCcw, Star } from 'lucide-react'

interface ServiceCardProps {
	service: Service
	index?: number
	showTopBadge?: boolean
}

export default function ServiceCard({
	service,
	index = 0,
	showTopBadge = false,
}: ServiceCardProps) {
	const basePackage = service.packages[0]
	const theme = CATEGORY_THEME[service.category] ?? CATEGORY_THEME.other

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: index * 0.05 }}
		>
			<Link
				to='/services/$serviceId'
				params={{ serviceId: service.id }}
				className='block group'
			>
				<div className='rounded-2xl border border-border bg-card overflow-hidden transition-colors duration-300'>
					{/* Thumbnail */}
					<div className='relative h-44 overflow-hidden bg-muted'>
						{service.thumbnail ? (
							<img
								src={service.thumbnail}
								alt={service.title}
								className='w-full h-full object-cover'
							/>
						) : (
							<div
								className={`w-full h-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}
							>
								<span className='text-5xl opacity-40 select-none'>
									{theme.emoji}
								</span>
							</div>
						)}

						{/* Category badge */}
						<div className='absolute top-3 left-3'>
							<Badge
								variant='secondary'
								className='bg-background/90 backdrop-blur-sm text-xs'
							>
								{SERVICE_CATEGORIES[service.category]}
							</Badge>
						</div>

						{(showTopBadge || service.isFeatured) && (
							<div className='absolute top-3 right-3'>
								<Badge className='bg-gold-500 text-white border-0 text-xs'>
									⭐ Топ
								</Badge>
							</div>
						)}
					</div>

					{/* Content */}
					<div className='p-4'>
						{/* Freelancer info */}
						<div className='flex items-center gap-2 mb-3'>
							<Avatar className='h-7 w-7'>
								<AvatarImage
									src={service.freelancer.avatar}
									alt={service.freelancer.name}
								/>
								<AvatarFallback className='bg-primary/10 text-primary text-xs font-semibold'>
									{getInitials(service.freelancer.name)}
								</AvatarFallback>
							</Avatar>
							<span className='text-sm font-medium text-foreground hover:text-primary transition-colors'>
								{service.freelancer.name}
							</span>
							{service.freelancer.isVerified && (
								<span className='text-blue-500 text-xs' title='Верифицирован'>
									✓
								</span>
							)}
						</div>

						{/* Title */}
						<h3 className='font-semibold text-foreground text-sm leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2'>
							{service.title}
						</h3>

						<p className='text-xs text-muted-foreground line-clamp-2 mb-3'>
							{truncate(service.description, 120)}
						</p>

						{/* Rating and stats */}
						<div className='flex items-center gap-3 text-xs text-muted-foreground mb-4'>
							<div className='flex items-center gap-1'>
								<Star className='h-3.5 w-3.5 fill-gold-400 text-gold-400' />
								<span className='font-semibold text-foreground'>
									{Number(service.rating.toFixed(1))}
								</span>
								<span>({service.reviewsCount})</span>
							</div>
							<div className='flex items-center gap-1'>
								<RotateCcw className='h-3 w-3' />
								<span>{service.ordersCount} заказов</span>
							</div>
						</div>

						{/* Price & delivery */}
						<div className='flex items-center justify-between pt-3 border-t border-border'>
							<div className='flex items-center gap-1 text-xs text-muted-foreground'>
								<Clock className='h-3 w-3' />
								<span>от {basePackage.deliveryDays} дн.</span>
							</div>
							<div className='text-right'>
								<p className='text-xs text-muted-foreground'>от</p>
								<p className='text-base font-bold text-foreground'>
									{formatPrice(basePackage.price)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</Link>
		</motion.div>
	)
}
