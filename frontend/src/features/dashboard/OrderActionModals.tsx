import { extractApiError } from '@/api/client'
import {
	createRefundRequest,
	requestDeadlineExtension,
	type Order,
	type RefundReason,
} from '@/api/orders'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarPlus, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'

const REFUND_REASONS: { value: RefundReason; label: string }[] = [
	{ value: 'MISSED_DEADLINE', label: 'Нарушен срок выполнения' },
	{ value: 'WORK_NOT_DELIVERED', label: 'Работа не предоставлена' },
	{ value: 'QUALITY_ISSUE', label: 'Проблемы с качеством' },
	{ value: 'REQUIREMENTS_NOT_MET', label: 'Требования не выполнены' },
	{ value: 'OTHER', label: 'Другая причина' },
]

function formatRub(amount: number) {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(amount)
}

function ModalShell({
	title,
	icon,
	onClose,
	children,
}: {
	title: string
	icon: React.ReactNode
	onClose: () => void
	children: React.ReactNode
}) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			onMouseDown={onClose}
		>
			<div
				className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-6"
				onMouseDown={(event) => event.stopPropagation()}
			>
				<div className="mb-4 flex items-center gap-3">
					<div className="rounded-xl bg-primary/10 p-2 text-primary">
						{icon}
					</div>
					<h3 className="flex-1 text-lg font-semibold text-foreground">
						{title}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
						aria-label="Закрыть"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				{children}
			</div>
		</div>
	)
}

export function ExtensionRequestModal({
	order,
	onClose,
}: {
	order: Order
	onClose: () => void
}) {
	const queryClient = useQueryClient()
	const [days, setDays] = useState(1)
	const [reason, setReason] = useState('')
	const [error, setError] = useState('')
	const mutation = useMutation({
		mutationFn: () => requestDeadlineExtension(order.id, days, reason),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
			onClose()
		},
		onError: (err: unknown) =>
			setError(extractApiError(err, 'Не удалось отправить запрос')),
	})

	return (
		<ModalShell
			title="Запросить продление"
			icon={<CalendarPlus className="h-5 w-5" />}
			onClose={onClose}
		>
			<p className="mb-4 text-sm text-muted-foreground">
				Заказ <span className="font-mono text-foreground">#{order.id}</span>.
				Клиент увидит запрошенный срок и вашу причину.
			</p>
			<label className="block text-sm font-medium text-foreground">
				Дополнительные дни
				<input
					type="number"
					min={1}
					max={30}
					value={days}
					onChange={(event) => setDays(Number(event.target.value))}
					className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
				/>
			</label>
			<label className="mt-3 block text-sm font-medium text-foreground">
				Почему требуется продление
				<textarea
					value={reason}
					onChange={(event) => setReason(event.target.value)}
					maxLength={1000}
					rows={4}
					placeholder="Опишите ситуацию (не менее 10 символов)"
					className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
				/>
			</label>
			{error && <p className="mt-2 text-xs text-destructive">{error}</p>}
			<div className="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onClick={onClose}
					className="rounded-xl border border-border px-4 py-2 text-sm"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={() => mutation.mutate()}
					disabled={
						mutation.isPending ||
						days < 1 ||
						days > 30 ||
						reason.trim().length < 10
					}
					className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
				>
					{mutation.isPending ? 'Отправляем…' : 'Отправить клиенту'}
				</button>
			</div>
		</ModalShell>
	)
}

export function RefundRequestModal({
	order,
	onClose,
	defaultMissedDeadline,
}: {
	order: Order
	onClose: () => void
	defaultMissedDeadline: boolean
}) {
	const queryClient = useQueryClient()
	const [reason, setReason] = useState<RefundReason>(
		defaultMissedDeadline ? 'MISSED_DEADLINE' : 'OTHER',
	)
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const mutation = useMutation({
		mutationFn: () => createRefundRequest(order.id, reason, message),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
			onClose()
		},
		onError: (err: unknown) =>
			setError(extractApiError(err, 'Не удалось создать запрос на возврат')),
	})

	return (
		<ModalShell
			title="Запросить возврат средств"
			icon={<RotateCcw className="h-5 w-5" />}
			onClose={onClose}
		>
			<div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-muted-foreground">
				<div className="mb-1 flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
					<AlertTriangle className="h-3.5 w-3.5" />
					Запрос уйдёт в очередь будущей админки
				</div>
				Это не автоматический возврат: администратор получит сохранённые условия
				заказа и разберёт ситуацию.
			</div>
			<dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-muted/50 p-3 text-xs">
				<dt className="text-muted-foreground">Номер</dt>
				<dd className="break-all font-mono">#{order.id}</dd>
				<dt className="text-muted-foreground">Услуга</dt>
				<dd>{order.service?.title ?? '—'}</dd>
				<dt className="text-muted-foreground">Пакет</dt>
				<dd>{order.package?.name ?? '—'}</dd>
				<dt className="text-muted-foreground">Стоимость</dt>
				<dd>{formatRub(order.totalPrice)}</dd>
				<dt className="text-muted-foreground">Срок</dt>
				<dd>
					{order.deadline
						? new Date(order.deadline).toLocaleString('ru-RU')
						: '—'}
				</dd>
			</dl>
			<label className="block text-sm font-medium text-foreground">
				Причина
				<select
					value={reason}
					onChange={(event) => setReason(event.target.value as RefundReason)}
					className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
				>
					{REFUND_REASONS.map((item) => (
						<option key={item.value} value={item.value}>
							{item.label}
						</option>
					))}
				</select>
			</label>
			<label className="mt-3 block text-sm font-medium text-foreground">
				Что произошло
				<textarea
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					maxLength={2000}
					rows={5}
					placeholder="Подробно опишите ситуацию (не менее 10 символов)"
					className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
				/>
			</label>
			{error && <p className="mt-2 text-xs text-destructive">{error}</p>}
			<div className="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onClick={onClose}
					className="rounded-xl border border-border px-4 py-2 text-sm"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={() => mutation.mutate()}
					disabled={mutation.isPending || message.trim().length < 10}
					className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
				>
					{mutation.isPending ? 'Отправляем…' : 'Отправить запрос'}
				</button>
			</div>
		</ModalShell>
	)
}
