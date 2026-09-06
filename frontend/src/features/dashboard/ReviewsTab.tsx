import { getMyReviews, getReceivedReviews } from '@/api/reviews'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import { useState } from 'react'

function ReviewStars({ rating }: { rating: number }) {
	return (
		<div className='flex gap-0.5'>
			{[1, 2, 3, 4, 5].map(n => (
				<Star
					key={n}
					className={`w-4 h-4 ${
						n <= rating
							? 'text-yellow-400 fill-yellow-400'
							: 'text-muted-foreground/30'
					}`}
				/>
			))}
		</div>
	)
}

export function ReviewsTab({ role }: { role: string }) {
	const isFreelancer = role === 'freelancer'
	const [page, setPage] = useState(1)
	const limit = 10

	const { data: myData, isLoading: myLoading } = useQuery({
		queryKey: ['my-reviews', page],
		queryFn: () => getMyReviews(page, limit),
		enabled: !isFreelancer,
	})

	const { data: receivedData, isLoading: receivedLoading } = useQuery({
		queryKey: ['received-reviews', page],
		queryFn: () => getReceivedReviews(page, limit),
		enabled: isFreelancer,
	})

	const isLoading = isFreelancer ? receivedLoading : myLoading
	const total = isFreelancer ? (receivedData?.total ?? 0) : (myData?.total ?? 0)
	const totalPages = Math.max(1, Math.ceil(total / limit))

	if (isLoading) {
		return (
			<div className='glass-card rounded-2xl p-6 space-y-3'>
				{[0, 1, 2].map(i => (
					<div key={i} className='h-20 bg-muted/50 rounded-xl animate-pulse' />
				))}
			</div>
		)
	}

	// ── Студент: мои написанные отзывы ──────────────────────────────────────
	if (!isFreelancer) {
		const reviews = myData?.data ?? []
		return (
			<div className='glass-card rounded-2xl p-6'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='font-semibold text-foreground'>
						Мои отзывы
						{total > 0 && (
							<span className='ml-2 text-sm font-normal text-muted-foreground'>
								({total})
							</span>
						)}
					</h2>
				</div>
				{reviews.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
						<Star className='w-12 h-12 opacity-20 mb-3' />
						<p className='text-sm font-medium text-foreground'>
							Вы ещё не оставляли отзывов
						</p>
						<p className='text-xs text-muted-foreground mt-1'>
							Завершите заказ, чтобы оставить отзыв
						</p>
					</div>
				) : (
					<div className='space-y-4'>
						{reviews.map(review => (
							<div
								key={review.id}
								className='border border-border rounded-xl p-4 hover:border-primary/30 transition-colors'
							>
								<div className='flex items-start justify-between gap-3 mb-2'>
									<Link
										to='/services/$serviceId'
										params={{ serviceId: review.service.id }}
										className='text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1'
									>
										{review.service.title}
									</Link>
									<ReviewStars rating={review.rating} />
								</div>
								{review.comment && (
									<p className='text-sm text-muted-foreground leading-relaxed mb-2'>
										{review.comment}
									</p>
								)}
								<div className='flex items-center justify-between'>
									<p className='text-xs text-muted-foreground'>
										{review.service.freelancer?.name && (
											<span className='mr-2'>
												Исполнитель: {review.service.freelancer.name}
											</span>
										)}
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
						))}
					</div>
				)}
				{totalPages > 1 && (
					<div className='flex items-center justify-center gap-3 mt-6'>
						<button
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page === 1}
							className='px-4 py-2 rounded-xl border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors'
						>
							Назад
						</button>
						<span className='text-sm text-muted-foreground'>
							{page} / {totalPages}
						</span>
						<button
							onClick={() => setPage(p => Math.min(totalPages, p + 1))}
							disabled={page >= totalPages}
							className='px-4 py-2 rounded-xl border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors'
						>
							Далее
						</button>
					</div>
				)}
			</div>
		)
	}

	// ── Фрилансер: отзывы обо мне ───────────────────────────────────────────
	const reviews = receivedData?.data ?? []
	return (
		<div className='glass-card rounded-2xl p-6'>
			<div className='flex items-center justify-between mb-4'>
				<h2 className='font-semibold text-foreground'>
					Отзывы обо мне
					{total > 0 && (
						<span className='ml-2 text-sm font-normal text-muted-foreground'>
							({total})
						</span>
					)}
				</h2>
			</div>
			{reviews.length === 0 ? (
				<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
					<Star className='w-12 h-12 opacity-20 mb-3' />
					<p className='text-sm font-medium text-foreground'>
						Отзывов пока нет
					</p>
					<p className='text-xs text-muted-foreground mt-1'>
						Выполняйте заказы — и клиенты оставят отзывы
					</p>
				</div>
			) : (
				<div className='space-y-4'>
					{reviews.map(review => (
						<div
							key={review.id}
							className='border border-border rounded-xl p-4 hover:border-primary/30 transition-colors'
						>
							<div className='flex items-start justify-between gap-3 mb-1'>
								<div className='flex items-center gap-2 min-w-0'>
									<div className='w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden'>
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
									<div className='min-w-0'>
										<p className='text-sm font-medium text-foreground leading-tight'>
											{review.author.name}
										</p>
										<Link
											to='/services/$serviceId'
											params={{ serviceId: review.service.id }}
											className='text-xs text-muted-foreground hover:text-primary transition-colors line-clamp-1'
										>
											{review.service.title}
										</Link>
									</div>
								</div>
								<div className='flex flex-col items-end gap-1 shrink-0'>
									<ReviewStars rating={review.rating} />
									<p className='text-xs text-muted-foreground'>
										{new Date(review.createdAt).toLocaleDateString('ru-RU', {
											day: 'numeric',
											month: 'short',
											year: 'numeric',
										})}
									</p>
								</div>
							</div>
							{review.comment && (
								<p className='text-sm text-muted-foreground leading-relaxed mt-2'>
									{review.comment}
								</p>
							)}
						</div>
					))}
				</div>
			)}
			{totalPages > 1 && (
				<div className='flex items-center justify-center gap-3 mt-6'>
					<button
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
						className='px-4 py-2 rounded-xl border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors'
					>
						Назад
					</button>
					<span className='text-sm text-muted-foreground'>
						{page} / {totalPages}
					</span>
					<button
						onClick={() => setPage(p => Math.min(totalPages, p + 1))}
						disabled={page >= totalPages}
						className='px-4 py-2 rounded-xl border border-border text-sm disabled:opacity-40 hover:bg-muted/50 transition-colors'
					>
						Далее
					</button>
				</div>
			)}
		</div>
	)
}
