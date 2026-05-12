import { extractApiError } from '@/api/client'
import { getMyOrders } from '@/api/orders'
import { createReview, getServiceReviews } from '@/api/reviews'
import type { Service } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useState } from 'react'

interface Props {
	serviceId: string
	isAuthenticated: boolean
	isStudent: boolean
	isOwnService: boolean
}

function StarRating({
	value,
	onChange,
}: {
	value: number
	onChange?: (v: number) => void
}) {
	const [hovered, setHovered] = useState(0)
	const display = onChange ? hovered || value : value
	return (
		<div className='flex gap-1'>
			{[1, 2, 3, 4, 5].map(n => (
				<Star
					key={n}
					className={`w-5 h-5 transition-colors ${
						n <= display
							? 'text-yellow-400 fill-yellow-400'
							: 'text-muted-foreground'
					} ${onChange ? 'cursor-pointer' : ''}`}
					onMouseEnter={() => onChange && setHovered(n)}
					onMouseLeave={() => onChange && setHovered(0)}
					onClick={() => onChange?.(n)}
				/>
			))}
		</div>
	)
}

export default function ReviewsSection({
	serviceId,
	isAuthenticated,
	isStudent,
	isOwnService,
}: Props) {
	const queryClient = useQueryClient()
	const [rating, setRating] = useState(5)
	const [comment, setComment] = useState('')
	const [submitError, setSubmitError] = useState('')
	const [submitted, setSubmitted] = useState(false)
	const [limit, setLimit] = useState(10)

	const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
		queryKey: ['reviews', serviceId, limit],
		queryFn: () => getServiceReviews(serviceId, 1, limit),
	})

	// Find completed orders for this service (to get orderId for review)
	const { data: myOrders = [] } = useQuery({
		queryKey: ['my-orders'],
		queryFn: getMyOrders,
		enabled: isAuthenticated && isStudent && !isOwnService,
	})

	const completedOrderForService = myOrders.find(
		o => o.serviceId === serviceId && o.status === 'completed' && !o.review,
	)

	const { mutate: submitReview, isPending: submitting } = useMutation({
		mutationFn: () =>
			createReview(completedOrderForService!.id, rating, comment),
		onSuccess: () => {
			setSubmitted(true)
			setComment('')
			queryClient.invalidateQueries({ queryKey: ['reviews', serviceId] })
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
			queryClient.invalidateQueries({ queryKey: ['received-reviews'] })
			queryClient.setQueryData<Service | null>(['service', serviceId], prev => {
				if (!prev) return prev
				const nextCount = (prev.reviewsCount ?? 0) + 1
				const nextRating =
					((prev.rating ?? 0) * (prev.reviewsCount ?? 0) + rating) / nextCount
				return { ...prev, reviewsCount: nextCount, rating: nextRating }
			})
			queryClient.invalidateQueries({ queryKey: ['service', serviceId] })
		},
		onError: (err: unknown) => {
			setSubmitError(extractApiError(err, 'Ошибка при отправке отзыва'))
		},
	})

	const reviews = reviewsData?.data ?? []
	const total = reviewsData?.total ?? 0
	const hasMore = reviews.length < total

	return (
		<div className='glass-card rounded-2xl p-6'>
			<h2 className='font-semibold text-foreground mb-4'>
				Отзывы
				{total > 0 && ` (${total})`}
			</h2>

			{/* Review form */}
			{isAuthenticated &&
				isStudent &&
				!isOwnService &&
				completedOrderForService &&
				!submitted && (
					<div className='mb-6 p-4 rounded-xl bg-muted/30 border border-border'>
						<p className='text-sm font-medium text-foreground mb-3'>
							Оставьте отзыв о выполненном заказе
						</p>
						<div className='mb-3'>
							<StarRating value={rating} onChange={setRating} />
						</div>
						<textarea
							id='review-comment'
							name='review-comment'
							value={comment}
							onChange={e => setComment(e.target.value)}
							placeholder='Расскажите об опыте работы с исполнителем...'
							rows={3}
							maxLength={500}
							className='w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none'
						/>
						{submitError && (
							<p className='text-xs text-destructive mt-1'>{submitError}</p>
						)}
						<button
							onClick={() => {
								setSubmitError('')
								submitReview()
							}}
							disabled={submitting || rating === 0}
							className='mt-3 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors'
						>
							{submitting ? 'Отправляем...' : 'Отправить отзыв'}
						</button>
					</div>
				)}

			{submitted && (
				<div className='mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-600'>
					Спасибо! Ваш отзыв опубликован.
				</div>
			)}

			{/* Reviews list */}
			{reviewsLoading && reviews.length === 0 ? (
				<div className='space-y-3'>
					{[0, 1].map(i => (
						<div
							key={i}
							className='h-16 bg-muted/50 rounded-xl animate-pulse'
						/>
					))}
				</div>
			) : reviews.length === 0 ? (
				<p className='text-sm text-muted-foreground'>Отзывов пока нет</p>
			) : (
				<div className='space-y-4'>
					{reviews.map(review => (
						<div
							key={review.id}
							className='border-t border-border pt-4 first:border-0 first:pt-0'
						>
							<div className='flex items-start justify-between gap-3 mb-2'>
								<div className='flex items-center gap-2'>
									<div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden shrink-0'>
										{review.author.avatar ? (
											<img
												src={review.author.avatar}
												alt={review.author.name}
												className='w-full h-full object-cover'
											/>
										) : (
											review.author.name.charAt(0)
										)}
									</div>
									<div>
										<p className='text-sm font-medium text-foreground leading-tight'>
											{review.author.name}
										</p>
										<p className='text-xs text-muted-foreground'>
											{new Date(review.createdAt).toLocaleDateString('ru-RU', {
												day: 'numeric',
												month: 'long',
												year: 'numeric',
											})}
										</p>
									</div>
								</div>
								<StarRating value={review.rating} />
							</div>
							{review.comment && (
								<p className='text-sm text-muted-foreground leading-relaxed'>
									{review.comment}
								</p>
							)}
						</div>
					))}

					{hasMore && (
						<div className='pt-4 flex justify-center'>
							<button
								onClick={() => setLimit(l => l + 10)}
								disabled={reviewsLoading}
								className='px-5 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-50 transition-colors'
							>
								{reviewsLoading
									? 'Загружаем...'
									: `Показать ещё (ещё ${total - reviews.length})`}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
