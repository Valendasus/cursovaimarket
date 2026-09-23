import { extractApiError } from '@/api/client'
import type { Order } from '@/api/orders'
import {
	confirmOrder,
	payOrder,
	resolveDeadlineExtension,
	updateOrderStatus,
} from '@/api/orders'
import { createReview } from '@/api/reviews'
import { truncate } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
	AlertTriangle,
	CalendarPlus,
	Check,
	Clock,
	MessageCircle,
	RotateCcw,
	Star,
	Wallet,
} from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { ConfirmCountdown } from './ConfirmCountdown'
import { ExtensionRequestModal, RefundRequestModal } from './OrderActionModals'

const STATUS_LABEL: Record<string, string> = {
	pending: 'Ожидает подтверждения',
	awaiting_payment: 'Ожидает оплаты',
	payment_processing: 'Оплата обрабатывается',
	accepted: 'Принят',
	in_progress: 'В работе',
	review: 'На проверке',
	revision: 'На доработке',
	completing: 'Выплата обрабатывается',
	completed: 'Завершён',
	cancelled: 'Отменён',
}

const STATUS_COLOR: Record<string, string> = {
	pending: 'bg-yellow-500/10 text-yellow-600',
	awaiting_payment: 'bg-amber-500/10 text-amber-600',
	payment_processing: 'bg-amber-500/10 text-amber-600',
	accepted: 'bg-sky-500/10 text-sky-600',
	in_progress: 'bg-blue-500/10 text-blue-600',
	review: 'bg-purple-500/10 text-purple-600',
	revision: 'bg-orange-500/10 text-orange-600',
	completing: 'bg-purple-500/10 text-purple-600',
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

function subscribeToMinuteTick(onStoreChange: () => void) {
	const timer = window.setInterval(onStoreChange, 60_000)
	return () => window.clearInterval(timer)
}

function getMinuteSnapshot() {
	return Math.floor(Date.now() / 60_000)
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
	const minute = useSyncExternalStore(
		subscribeToMinuteTick,
		getMinuteSnapshot,
		() => 0,
	)
	const now = minute * 60_000
	const [showExtension, setShowExtension] = useState(false)
	const [showRefund, setShowRefund] = useState(false)

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

	// Исполнитель подтверждает заказ (без списания) → «ожидает оплаты»
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

	/**
	 * Заказчик оплачивает подтверждённый заказ → списание → заказ в работе.
	 * Отказ в оплате приходит успешным ответом (заказ остаётся «ожидает
	 * оплаты» с payment.failureReason) — можно повторить.
	 */
	const { mutate: pay, isPending: paying } = useMutation({
		mutationFn: () => payOrder(order.id),
		onSuccess: () => {
			setStatusError('')
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
		},
		onError: (err: unknown) => {
			setStatusError(extractApiError(err, 'Не удалось оплатить заказ'))
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

	const { mutate: decideExtension, isPending: decidingExtension } = useMutation(
		{
			mutationFn: (approved: boolean) =>
				resolveDeadlineExtension(
					order.id,
					order.latestDeadlineExtension!.id,
					approved,
				),
			onSuccess: () => {
				setStatusError('')
				queryClient.invalidateQueries({ queryKey: ['my-orders'] })
			},
			onError: (err: unknown) =>
				setStatusError(extractApiError(err, 'Не удалось принять решение')),
		},
	)

	const isTerminal =
		order.status === 'completed' || order.status === 'cancelled'
	const activeWorkStatuses = ['in_progress', 'review', 'revision']
	const freelancerWorkStatuses = ['in_progress', 'revision']
	const deadlineMs = order.deadline ? new Date(order.deadline).getTime() : null
	const remainingMs = deadlineMs == null ? null : deadlineMs - now
	const warningMs = (order.package?.deliveryDays ?? 0) * 86_400_000 * 0.1
	const deadlineIsHot = remainingMs != null && remainingMs <= warningMs
	const isOverdue = remainingMs != null && remainingMs <= 0
	const pendingExtension =
		order.latestDeadlineExtension?.status === 'pending'
			? order.latestDeadlineExtension
			: undefined
	const pendingRefund = order.latestRefundRequest?.status === 'pending'
	const canRequestRefund =
		role === 'student' &&
		order.payment?.status === 'succeeded' &&
		activeWorkStatuses.includes(order.status) &&
		!pendingRefund

	const deadlineText = (() => {
		if (remainingMs == null) return ''
		const absolute = Math.abs(remainingMs)
		const days = Math.floor(absolute / 86_400_000)
		const hours = Math.max(1, Math.ceil((absolute % 86_400_000) / 3_600_000))
		const value = days > 0 ? `${days} дн. ${hours} ч.` : `${hours} ч.`
		return remainingMs <= 0 ? `Срок истёк ${value} назад` : `Осталось ${value}`
	})()

	return (
		<div className="p-3 sm:p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors">
			{showExtension && (
				<ExtensionRequestModal
					order={order}
					onClose={() => setShowExtension(false)}
				/>
			)}
			{showRefund && (
				<RefundRequestModal
					order={order}
					defaultMissedDeadline={isOverdue}
					onClose={() => setShowRefund(false)}
				/>
			)}
			{statusError && (
				<p className="text-xs text-destructive mb-2">{statusError}</p>
			)}
			<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
				<div className="flex-1 min-w-0">
					<p className="font-medium text-foreground text-sm truncate">
						{order.service?.title ?? 'Услуга'}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						Пакет: {order.package?.name ?? '—'}
					</p>
					{order.package && (
						<p className="mt-0.5 text-xs text-muted-foreground">
							{order.package.deliveryDays} дн. · доработок:{' '}
							{order.package.revisions ?? 0}
							{order.package.features?.length
								? ` · ${order.package.features.join(', ')}`
								: ''}
						</p>
					)}
					{order.requirements && (
						<p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words line-clamp-2">
							Комментарий: {truncate(order.requirements, 200)}
						</p>
					)}
					<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
						<Clock className="w-3 h-3" />
						{new Date(order.createdAt).toLocaleDateString('ru-RU', {
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						})}
						{order.status === 'pending' && order.confirmDeadline && (
							<>
								<span className="opacity-40">·</span>
								<ConfirmCountdown deadline={order.confirmDeadline} />
							</>
						)}
					</p>

					{/* Оплата: статус эскроу и завершённых выплат */}
					{order.payment?.status === 'succeeded' && (
						<p className="text-xs text-green-600 flex items-center gap-1 mt-1">
							<Check className="w-3 h-3" />
							{role === 'freelancer'
								? order.status === 'completed'
									? `Заказ завершён, вам зачислено ${formatRub(order.payment.amount - order.payment.fee)}`
									: `Оплачено заказчиком (${formatRub(order.payment.amount - order.payment.fee)} в холде платформы)`
								: order.status === 'completed'
									? `Заказ завершён. Оплачено ${formatRub(order.payment.amount)}`
									: `Оплачено ${formatRub(order.payment.amount)} (в холде платформы)`}
						</p>
					)}
					{order.payment?.status === 'refunded' && (
						<p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
							<Wallet className="w-3 h-3 shrink-0" />
							Средства возвращены заказчику
						</p>
					)}
					{order.payment?.status === 'failed' && (
						<p className="text-xs text-destructive flex items-center gap-1 mt-1">
							<Wallet className="w-3 h-3 shrink-0" />
							Оплата не прошла
							{order.payment.failureReason
								? `: ${order.payment.failureReason}`
								: ''}
						</p>
					)}
					{role === 'freelancer' &&
						deadlineText &&
						freelancerWorkStatuses.includes(order.status) && (
							<p
								className={`mt-1 flex items-center gap-1 text-xs font-medium ${
									deadlineIsHot ? 'text-red-500' : 'text-muted-foreground'
								}`}
							>
								{deadlineIsHot ? (
									<AlertTriangle className="h-3 w-3" />
								) : (
									<Clock className="h-3 w-3" />
								)}
								{deadlineText}
							</p>
						)}
					{pendingExtension && (
						<div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-xs">
							<p className="font-medium text-amber-700 dark:text-amber-400">
								Запрошено продление на {pendingExtension.additionalDays} дн.
							</p>
							<p className="mt-0.5 text-muted-foreground">
								{pendingExtension.reason}
							</p>
						</div>
					)}
					{order.latestRefundRequest && (
						<p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
							<RotateCcw className="h-3 w-3" />
							Запрос на возврат:{' '}
							{order.latestRefundRequest.status === 'pending'
								? 'на рассмотрении'
								: order.latestRefundRequest.status === 'approved'
									? 'одобрен'
									: 'отклонён'}
						</p>
					)}
				</div>
				<div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
					<span
						className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] ?? 'bg-muted text-muted-foreground'}`}
					>
						{STATUS_LABEL[order.status] ?? order.status}
					</span>
					<span className="text-sm font-semibold text-foreground">
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
			<div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 mt-3 pt-3 border-t border-border/50">
				{/* Status buttons */}
				{!isTerminal && (
					<>
						{/* Исполнитель подтверждает входящий заказ (без списания) либо
						    отклоняет. Списание произойдёт позже, когда заказчик оплатит. */}
						{role === 'freelancer' && order.status === 'pending' && (
							<>
								<button
									onClick={() => confirm()}
									disabled={confirming}
									className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-1"
								>
									<Check className="w-3 h-3" />
									{confirming ? 'Подтверждаем...' : 'Подтвердить заказ'}
								</button>
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending || confirming}
									className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium"
								>
									Отклонить
								</button>
							</>
						)}
						{/* Исполнитель подтвердил — ждём, пока заказчик оплатит */}
						{role === 'freelancer' && order.status === 'awaiting_payment' && (
							<span className="text-xs text-muted-foreground py-1.5">
								Ожидает оплаты заказчиком
							</span>
						)}
						{/* Заказчик оплачивает подтверждённый заказ */}
						{role === 'student' && order.status === 'awaiting_payment' && (
							<>
								<button
									onClick={() => pay()}
									disabled={paying}
									className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-1"
								>
									<Wallet className="w-3 h-3" />
									{paying
										? 'Оплачиваем...'
										: `Оплатить ${formatRub(order.totalPrice)}`}
								</button>
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending || paying}
									className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium"
								>
									Отменить заказ
								</button>
							</>
						)}
						{order.status === 'payment_processing' && role === 'student' && (
							<button
								type="button"
								onClick={() => pay()}
								disabled={paying}
								className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 disabled:opacity-50"
							>
								{paying ? 'Проверяем…' : 'Проверить оплату'}
							</button>
						)}
						{order.status === 'completing' && role === 'student' && (
							<button
								type="button"
								onClick={() => changeStatus('completed')}
								disabled={isPending}
								className="rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-600 disabled:opacity-50"
							>
								{isPending ? 'Проверяем…' : 'Проверить выплату'}
							</button>
						)}
						{order.status === 'payment_processing' && role === 'freelancer' && (
							<span className="text-xs text-amber-600">
								Оплата обрабатывается…
							</span>
						)}
						{order.status === 'completing' && role === 'freelancer' && (
							<span className="text-xs text-purple-600">
								Выплата обрабатывается…
							</span>
						)}
						{/* Legacy: старые заказы в статусе «Принят» (оплачены до перехода
						    на раздельную оплату) — просто берём в работу */}
						{role === 'freelancer' && order.status === 'accepted' && (
							<button
								onClick={() => changeStatus('in_progress')}
								disabled={isPending}
								className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 disabled:opacity-50 transition-colors font-medium"
							>
								Взять в работу
							</button>
						)}
						{role === 'freelancer' && order.status === 'in_progress' && (
							<button
								onClick={() => changeStatus('review')}
								disabled={isPending}
								className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 disabled:opacity-50 transition-colors font-medium"
							>
								Отправить на проверку
							</button>
						)}
						{role === 'freelancer' && order.status === 'revision' && (
							<button
								onClick={() => changeStatus('in_progress')}
								disabled={isPending}
								className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 disabled:opacity-50 transition-colors font-medium"
							>
								Возобновить работу
							</button>
						)}
						{role === 'student' && order.status === 'review' && (
							<>
								<button
									onClick={() => changeStatus('completed')}
									disabled={isPending}
									className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50 transition-colors font-medium"
								>
									Принять работу
								</button>
								<button
									onClick={() => changeStatus('revision')}
									disabled={isPending}
									className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 disabled:opacity-50 transition-colors font-medium"
								>
									Запросить доработку
								</button>
							</>
						)}
						{/* Отмена заказчиком — только пока не оплачен (в pending;
						    в awaiting_payment кнопка отмены уже показана рядом с «Оплатить») */}
						{role === 'student' && order.status === 'pending' && (
							<button
								onClick={() => changeStatus('cancelled')}
								disabled={isPending}
								className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium"
							>
								Отменить заказ
							</button>
						)}
						{role === 'freelancer' &&
							isOverdue &&
							freelancerWorkStatuses.includes(order.status) &&
							!pendingExtension && (
								<button
									type="button"
									onClick={() => setShowExtension(true)}
									className="flex w-full items-center justify-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 sm:w-auto"
								>
									<CalendarPlus className="h-3 w-3" />
									Запросить продление
								</button>
							)}
						{role === 'student' && pendingExtension && (
							<>
								<button
									type="button"
									onClick={() => decideExtension(true)}
									disabled={decidingExtension}
									className="w-full rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 disabled:opacity-50 sm:w-auto"
								>
									Разрешить +{pendingExtension.additionalDays} дн.
								</button>
								<button
									type="button"
									onClick={() => decideExtension(false)}
									disabled={decidingExtension}
									className="w-full rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground disabled:opacity-50 sm:w-auto"
								>
									Отклонить
								</button>
							</>
						)}
						{canRequestRefund && (
							<button
								type="button"
								onClick={() => setShowRefund(true)}
								className="flex w-full items-center justify-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 sm:w-auto"
							>
								<RotateCcw className="h-3 w-3" />
								Запросить возврат
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
							className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors font-medium flex items-center justify-center gap-1"
						>
							<Star className="w-3 h-3" />
							Оставить отзыв
						</button>
					)}

				{/* Review already left badge */}
				{role === 'student' && order.status === 'completed' && order.review && (
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
						<span>Отзыв оставлен ({order.review.rating}/5)</span>
					</div>
				)}

				{/* Chat link — opens Messages tab with this partner */}
				{}
				<Link
					to="/dashboard"
					search={{
						tab: 'messages',
						partnerId:
							role === 'student' ? order.freelancerId : order.studentId,
					}}
					className="w-full sm:w-auto sm:ml-auto text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors font-medium flex items-center justify-center gap-1.5"
				>
					<MessageCircle className="w-3.5 h-3.5" />
					Написать
				</Link>
			</div>

			{/* Inline review form */}
			{showReview && (
				<div className="mt-3 pt-3 border-t border-border/50 space-y-2">
					<p className="text-xs font-medium text-foreground">Ваша оценка</p>
					<div className="flex gap-1">
						{[1, 2, 3, 4, 5].map((n) => (
							<button
								key={n}
								type="button"
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
						onChange={(e) => setReviewComment(e.target.value)}
						placeholder="Комментарий (необязательно)"
						rows={2}
						maxLength={500}
						className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
					/>
					{reviewError && (
						<p className="text-xs text-destructive">{reviewError}</p>
					)}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => submitReview()}
							disabled={reviewPending}
							className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors font-medium"
						>
							{reviewPending ? 'Отправляем...' : 'Отправить отзыв'}
						</button>
						<button
							type="button"
							onClick={() => {
								setShowReview(false)
								setReviewError('')
							}}
							className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
						>
							Отмена
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
