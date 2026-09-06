import { extractApiError } from '@/api/client'
import type { Order } from '@/api/orders'
import { confirmOrder, updateOrderStatus } from '@/api/orders'
import { createReview } from '@/api/reviews'
import { truncate } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, Clock, MessageCircle, Star, Wallet } from 'lucide-react'
import { useState } from 'react'
import { ConfirmCountdown } from './ConfirmCountdown'

const STATUS_LABEL: Record<string, string> = {
	pending: 'Ожидает',
	accepted: 'Принят',
	in_progress: 'В работе',
	review: 'На проверке',
	revision: 'На доработке',
	completed: 'Завершён',
	cancelled: 'Отменён',
}

const STATUS_COLOR: Record<string, string> = {
	pending: 'bg-yellow-500/10 text-yellow-600',
	accepted: 'bg-sky-500/10 text-sky-600',
	in_progress: 'bg-blue-500/10 text-blue-600',
	review: 'bg-purple-500/10 text-purple-600',
	revision: 'bg-orange-500/10 text-orange-600',
	completed: 'bg-green-500/10 text-green-600',
	cancelled: 'bg-red-500/10 text-red-500',
}

function formatRub(amount: number): string {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(amount)
}

export function OrderCard({
	order,
	role,
}: {
	order: Order
	role: 'student' | 'freelancer' | string
	currentUserId: string
	unread?: number
}) {
	const queryClient = useQueryClient()
	const [statusError, setStatusError] = useState('')

	// Review form state
	const [showReview, setShowReview] = useState(false)
	const [reviewRating, setReviewRating] = useState(5)
	const [reviewComment, setReviewComment] = useState('')
	const [reviewError, setReviewError] = useState('')
	const [reviewHover, setReviewHover] = useState(0)

	/**
	 * Завершение заказа и новый отзыв меняют на бэкенде счётчики и рейтинг
	 * (service.ordersCount / rating, profile.completedOrders / rating).
	 * Сбрасываем и списки, которые их показывают, иначе они висят со старыми
	 * числами до перезагрузки страницы.
	 */
	const invalidateRatingConsumers = () => {
		queryClient.invalidateQueries({ queryKey: ['service', order.serviceId] })
		queryClient.invalidateQueries({
			queryKey: ['freelancer', order.freelancerId],
		})
		queryClient.invalidateQueries({ queryKey: ['services'] })
		queryClient.invalidateQueries({ queryKey: ['popular-services'] })
		queryClient.invalidateQueries({ queryKey: ['featured-services'] })
		queryClient.invalidateQueries({ queryKey: ['top-freelancers'] })
	}

	const { mutate: changeStatus, isPending } = useMutation({
		mutationFn: (status: string) => updateOrderStatus(order.id, status),
		onSuccess: (_data, status) => {
			setStatusError('')
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
			if (status === 'completed') invalidateRatingConsumers()
		},
		onError: (err: unknown) => {
			setStatusError(extractApiError(err, 'Не удалось изменить статус'))
		},
	})

	/**
	 * Подтверждение проводит оплату. Отказ в оплате приходит успешным ответом
	 * с отменённым заказом — бэкенд намеренно не бросает исключение, чтобы
	 * инвалидация сработала и карточка обновилась.
	 */
	const { mutate: confirm, isPending: confirming } = useMutation({
		mutationFn: () => confirmOrder(order.id),
		onSuccess: () => {
			setStatusError('')
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
		},
		onError: (err: unknown) => {
			setStatusError(extractApiError(err, 'Не удалось подтвердить заказ'))
		},
	})

	const { mutate: submitReview, isPending: reviewPending } = useMutation({
		mutationFn: () =>
			createReview(order.id, reviewRating, reviewComment || undefined),
		onSuccess: () => {
			setReviewError('')
			setShowReview(false)
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
			queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
			// то же, что делает ReviewsSection при отзыве со страницы услуги
			queryClient.invalidateQueries({ queryKey: ['received-reviews'] })
			queryClient.invalidateQueries({ queryKey: ['reviews', order.serviceId] })
			invalidateRatingConsumers()
		},
		onError: (err: unknown) => {
			setReviewError(extractApiError(err, 'Не удалось отправить отзыв'))
		},
	})

	const isTerminal =
		order.status === 'completed' || order.status === 'cancelled'

	return (
		<div className='p-3 sm:p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors'>
			{statusError && (
				<p className='text-xs text-destructive mb-2'>{statusError}</p>
			)}
			<div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3'>
				<div className='flex-1 min-w-0'>
					<p className='font-medium text-foreground text-sm truncate'>
						{order.service?.title ?? 'Услуга'}
					</p>
					<p className='text-xs text-muted-foreground mt-0.5'>
						Пакет: {order.package?.name ?? '—'}
					</p>
					{order.requirements && (
						<p className='text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words line-clamp-2'>
							Комментарий: {truncate(order.requirements, 200)}
						</p>
					)}
					<p className='text-xs text-muted-foreground flex items-center gap-1 mt-1'>
						<Clock className='w-3 h-3' />
						{new Date(order.createdAt).toLocaleDateString('ru-RU', {
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						})}
						{order.status === 'pending' && order.confirmDeadline && (
							<>
								<span className='opacity-40'>·</span>
								<ConfirmCountdown deadline={order.confirmDeadline} />
							</>
						)}
					</p>

					{/* Оплата: успех показываем исполнителю (он получил деньги),
					    отказ — обеим сторонам, чтобы было понятно, почему отмена */}
					{order.payment?.status === 'succeeded' && (
						<p className='text-xs text-green-600 flex items-center gap-1 mt-1'>
							<Check className='w-3 h-3' />
							{role === 'freelancer'
								? `Оплачено, вам зачислено ${formatRub(order.payment.amount - order.payment.fee)}`
								: `Оплачено ${formatRub(order.payment.amount)}`}
						</p>
					)}
					{order.payment?.status === 'failed' && (
						<p className='text-xs text-destructive flex items-center gap-1 mt-1'>
							<Wallet className='w-3 h-3 shrink-0' />
							Оплата не прошла
							{order.payment.failureReason
								? `: ${order.payment.failureReason}`
								: ''}
						</p>
					)}
				</div>
				<div className='flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto'>
					<span
						className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'bg-muted text-muted-foreground'}`}
					>
						{STATUS_LABEL[order.status] ?? order.status}
					</span>
					<span className='text-sm font-semibold text-foreground'>
						{order.totalPrice != null
							? new Intl.NumberFormat('ru-RU', {
									style: 'currency',
									currency: 'RUB',
									maximumFractionDigits: 0,
								}).format(order.totalPrice)
							: '—'}
					</span>
				</div>
			</div>

			{/* Actions row: status buttons + chat toggle */}
			<div className='flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 mt-3 pt-3 border-t border-border/50'>
				{/* Status buttons */}
				{!isTerminal && (
					<>
						{/* Из PENDING вперёд только через подтверждение — оно же
						    проводит оплату. Прямого «Взять в работу» здесь нет:
						    бэкенд такой переход отклонит. */}
						{role === 'freelancer' && order.status === 'pending' && (
							<>
								<button
									onClick={() => confirm()}
									disabled={confirming}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-1'
								>
									<Check className='w-3 h-3' />
									{confirming ? 'Подтверждаем...' : 'Подтвердить заказ'}
								</button>
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending || confirming}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Отклонить
								</button>
							</>
						)}
						{role === 'freelancer' && order.status === 'accepted' && (
							<>
								<button
									onClick={() => changeStatus('in_progress')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Взять в работу
								</button>
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Отклонить
								</button>
							</>
						)}
						{role === 'freelancer' && order.status === 'in_progress' && (
							<>
								<button
									onClick={() => changeStatus('review')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Отправить на проверку
								</button>
								<button
									onClick={() => changeStatus('completed')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Завершить работу
								</button>
							</>
						)}
						{role === 'freelancer' && order.status === 'revision' && (
							<>
								<button
									onClick={() => changeStatus('in_progress')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Возобновить работу
								</button>
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Отменить
								</button>
							</>
						)}
						{role === 'student' && order.status === 'review' && (
							<>
								<button
									onClick={() => changeStatus('completed')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Принять работу
								</button>
								<button
									onClick={() => changeStatus('revision')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Запросить доработку
								</button>
							</>
						)}
						{role === 'student' &&
							(order.status === 'pending' || order.status === 'accepted') && (
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending}
									className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Отменить заказ
								</button>
							)}
					</>
				)}

				{/* Leave review: student + completed + no review yet */}
				{role === 'student' &&
					order.status === 'completed' &&
					!order.review &&
					!showReview && (
						<button
							onClick={() => setShowReview(true)}
							className='w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors font-medium flex items-center justify-center gap-1'
						>
							<Star className='w-3 h-3' />
							Оставить отзыв
						</button>
					)}

				{/* Review already left badge */}
				{role === 'student' && order.status === 'completed' && order.review && (
					<div className='flex items-center gap-1 text-xs text-muted-foreground'>
						<Star className='w-3 h-3 fill-yellow-400 text-yellow-400' />
						<span>Отзыв оставлен ({order.review.rating}/5)</span>
					</div>
				)}

				{/* Chat link — opens Messages tab with this partner */}
				{}
				<Link
					to='/dashboard'
					search={{
						tab: 'messages',
						partnerId:
							role === 'student' ? order.freelancerId : order.studentId,
					}}
					className='w-full sm:w-auto sm:ml-auto text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors font-medium flex items-center justify-center gap-1.5'
				>
					<MessageCircle className='w-3.5 h-3.5' />
					Написать
				</Link>
			</div>

			{/* Inline review form */}
			{showReview && (
				<div className='mt-3 pt-3 border-t border-border/50 space-y-2'>
					<p className='text-xs font-medium text-foreground'>Ваша оценка</p>
					<div className='flex gap-1'>
						{[1, 2, 3, 4, 5].map(n => (
							<button
								key={n}
								type='button'
								onMouseEnter={() => setReviewHover(n)}
								onMouseLeave={() => setReviewHover(0)}
								onClick={() => setReviewRating(n)}
							>
								<Star
									className={`w-5 h-5 transition-colors ${
										n <= (reviewHover || reviewRating)
											? 'text-yellow-400 fill-yellow-400'
											: 'text-muted-foreground/30'
									}`}
								/>
							</button>
						))}
					</div>
					<textarea
						value={reviewComment}
						onChange={e => setReviewComment(e.target.value)}
						placeholder='Комментарий (необязательно)'
						rows={2}
						maxLength={500}
						className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none'
					/>
					{reviewError && (
						<p className='text-xs text-destructive'>{reviewError}</p>
					)}
					<div className='flex gap-2'>
						<button
							type='button'
							onClick={() => submitReview()}
							disabled={reviewPending}
							className='text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors font-medium'
						>
							{reviewPending ? 'Отправляем...' : 'Отправить отзыв'}
						</button>
						<button
							type='button'
							onClick={() => {
								setShowReview(false)
								setReviewError('')
							}}
							className='text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors'
						>
							Отмена
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
