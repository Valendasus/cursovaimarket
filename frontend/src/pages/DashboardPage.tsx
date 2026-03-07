import { updateMeApi, updateProfileApi } from '@/api/auth'
import { getUnreadCounts } from '@/api/chat'
import { extractApiError } from '@/api/client'
import type { Order } from '@/api/orders'
import { getMyOrders, updateOrderStatus } from '@/api/orders'
import { getMyReviews, getReceivedReviews } from '@/api/reviews'
import type { CreateServicePayload } from '@/api/services'
import { createService, deleteService, getMyServices } from '@/api/services'
import ChatPane from '@/features/chat/ChatPane'
import { useChatSocket } from '@/hooks/useChatSocket'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Service, ServiceCategory, ServiceLevel } from '@/types'
import { SERVICE_CATEGORIES, SERVICE_LEVELS } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	Briefcase,
	Check,
	Clock,
	LayoutDashboard,
	Loader2,
	LogOut,
	MessageCircle,
	MessageSquare,
	Plus,
	Send,
	Settings,
	ShoppingBag,
	Star,
	Trash2,
	WifiOff,
	X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type TabId = 'orders' | 'services' | 'messages' | 'reviews' | 'settings'

const tabs: {
	id: TabId
	label: string
	icon: React.ElementType
	freelancerOnly?: boolean
}[] = [
	{ id: 'orders', label: 'Мои заказы', icon: ShoppingBag },
	{
		id: 'services',
		label: 'Мои услуги',
		icon: Briefcase,
		freelancerOnly: true,
	},
	{ id: 'messages', label: 'Сообщения', icon: MessageSquare },
	{ id: 'reviews', label: 'Отзывы', icon: Star },
	{ id: 'settings', label: 'Настройки', icon: Settings },
]

const STATUS_LABEL: Record<string, string> = {
	pending: 'Ожидает',
	in_progress: 'В работе',
	completed: 'Завершён',
	cancelled: 'Отменён',
}

const STATUS_COLOR: Record<string, string> = {
	pending: 'bg-yellow-500/10 text-yellow-600',
	in_progress: 'bg-blue-500/10 text-blue-600',
	completed: 'bg-green-500/10 text-green-600',
	cancelled: 'bg-red-500/10 text-red-500',
}

function OrderCard({
	order,
	role,
	currentUserId,
	unread = 0,
}: {
	order: Order
	role: 'student' | 'freelancer' | string
	currentUserId: string
	unread?: number
}) {
	const queryClient = useQueryClient()
	const [statusError, setStatusError] = useState('')
	const [showChat, setShowChat] = useState(false)

	const { mutate: changeStatus, isPending } = useMutation({
		mutationFn: (status: string) => updateOrderStatus(order.id, status),
		onSuccess: () => {
			setStatusError('')
			queryClient.invalidateQueries({ queryKey: ['my-orders'] })
		},
		onError: (err: unknown) => {
			setStatusError(extractApiError(err, 'Не удалось изменить статус'))
		},
	})

	const isTerminal =
		order.status === 'completed' || order.status === 'cancelled'

	return (
		<div className='p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors'>
			{statusError && (
				<p className='text-xs text-destructive mb-2'>{statusError}</p>
			)}
			<div className='flex items-start justify-between gap-4'>
				<div className='flex-1 min-w-0'>
					<p className='font-medium text-foreground text-sm truncate'>
						{order.service?.title ?? 'Услуга'}
					</p>
					<p className='text-xs text-muted-foreground mt-0.5'>
						Пакет: {order.package?.name ?? '—'}
					</p>
					<p className='text-xs text-muted-foreground flex items-center gap-1 mt-1'>
						<Clock className='w-3 h-3' />
						{new Date(order.createdAt).toLocaleDateString('ru-RU', {
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						})}
					</p>
				</div>
				<div className='flex flex-col items-end gap-2 shrink-0'>
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
			<div className='flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50'>
				{/* Status buttons */}
				{!isTerminal && (
					<>
						{role === 'freelancer' && order.status === 'pending' && (
							<>
								<button
									onClick={() => changeStatus('in_progress')}
									disabled={isPending}
									className='text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Взять в работу
								</button>
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending}
									className='text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Отклонить
								</button>
							</>
						)}
						{role === 'freelancer' && order.status === 'in_progress' && (
							<button
								onClick={() => changeStatus('completed')}
								disabled={isPending}
								className='text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-50 transition-colors font-medium'
							>
								Завершить работу
							</button>
						)}
						{role === 'student' &&
							(order.status === 'pending' ||
								order.status === 'in_progress') && (
								<button
									onClick={() => changeStatus('cancelled')}
									disabled={isPending}
									className='text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors font-medium'
								>
									Отменить заказ
								</button>
							)}
					</>
				)}

				{/* Chat toggle — always available */}
				<button
					onClick={() => setShowChat(v => !v)}
					className={`ml-auto relative text-xs px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
						showChat
							? 'bg-primary/10 text-primary'
							: 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
					}`}
				>
					<MessageCircle className='w-3.5 h-3.5' />
					Чат
					{unread > 0 && !showChat && (
						<span className='absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold'>
							{unread > 9 ? '9+' : unread}
						</span>
					)}
				</button>
			</div>

			{/* Inline chat */}
			<ChatPane
				orderId={order.id}
				currentUserId={currentUserId}
				isOpen={showChat}
			/>
		</div>
	)
}

// ─── Messages Tab ─────────────────────────────────────────────────────────────

/** Inner chat content used by MessagesTab (messages list + input) */
function InlineChatContent({
	orderId,
	currentUserId,
}: {
	orderId: string
	currentUserId: string
}) {
	const { messages, status, sendMessage, markRead } = useChatSocket({
		orderId,
		enabled: true,
	})
	const [input, setInput] = useState('')
	const [sending, setSending] = useState(false)
	const bottomRef = useRef<HTMLDivElement | null>(null)
	const inputRef = useRef<HTMLTextAreaElement | null>(null)

	useEffect(() => {
		markRead()
	}, [markRead, orderId])

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const handleSend = async () => {
		const trimmed = input.trim()
		if (!trimmed || sending) return
		setSending(true)
		setInput('')
		try {
			await sendMessage(trimmed)
		} finally {
			setSending(false)
			inputRef.current?.focus()
		}
	}

	return (
		<>
			{/* Status indicator */}
			{status !== 'connected' && (
				<div className='flex items-center gap-1.5 px-4 py-1.5 text-xs bg-muted/50 border-b border-border'>
					{status === 'connecting' && (
						<>
							<Loader2 className='w-3 h-3 animate-spin text-primary' />
							<span className='text-muted-foreground'>Подключение...</span>
						</>
					)}
					{(status === 'error' || status === 'idle') && (
						<>
							<WifiOff className='w-3 h-3 text-destructive' />
							<span className='text-destructive'>Нет соединения</span>
						</>
					)}
				</div>
			)}

			{/* Messages */}
			<div className='flex-1 overflow-y-auto p-4 space-y-3'>
				{messages.length === 0 ? (
					<div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
						<MessageCircle className='w-8 h-8 opacity-20 mb-2' />
						<p className='text-xs'>Сообщений пока нет</p>
					</div>
				) : (
					messages.map(msg => {
						const isMine = msg.senderId === currentUserId
						const time = new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
							hour: '2-digit',
							minute: '2-digit',
						})
						return (
							<div
								key={msg.id}
								className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
							>
								{!isMine && (
									<div className='w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden'>
										{msg.sender.avatar ? (
											<img
												src={msg.sender.avatar}
												alt={msg.sender.name}
												className='w-full h-full object-cover'
											/>
										) : (
											msg.sender.name.charAt(0).toUpperCase()
										)}
									</div>
								)}
								<div
									className={`max-w-[70%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}
								>
									<div
										className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
											isMine
												? 'bg-primary text-primary-foreground rounded-br-sm'
												: 'bg-muted text-foreground rounded-bl-sm'
										}`}
									>
										{msg.content}
									</div>
									<span className='text-[10px] text-muted-foreground px-1'>
										{time}
										{isMine && (
											<span className='ml-1 opacity-60'>
												{msg.isRead ? '✓✓' : '✓'}
											</span>
										)}
									</span>
								</div>
							</div>
						)
					})
				)}
				<div ref={bottomRef} />
			</div>

			{/* Input */}
			<div className='shrink-0 border-t border-border p-3 flex items-end gap-2'>
				<textarea
					ref={inputRef}
					value={input}
					onChange={e => setInput(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							void handleSend()
						}
					}}
					placeholder='Напишите сообщение...'
					rows={1}
					maxLength={2000}
					className='flex-1 resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[38px] max-h-20 leading-5'
				/>
				<button
					onClick={() => void handleSend()}
					disabled={!input.trim() || sending}
					className='shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95'
				>
					{sending ? (
						<Loader2 className='w-4 h-4 animate-spin' />
					) : (
						<Send className='w-4 h-4' />
					)}
				</button>
			</div>
		</>
	)
}

function MessagesTab({
	currentUserId,
	userRole,
}: {
	currentUserId: string
	userRole: string
}) {
	const { data: orders = [], isLoading } = useQuery({
		queryKey: ['my-orders'],
		queryFn: getMyOrders,
	})

	const { data: unreadCounts = {} } = useQuery({
		queryKey: ['unread-counts'],
		queryFn: getUnreadCounts,
		refetchInterval: 15000,
	})

	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
	const selectedOrder = orders.find(o => o.id === selectedOrderId)

	const counterpart = (order: Order) =>
		userRole === 'student' ? order.freelancer : order.student

	return (
		<div className='glass-card rounded-2xl overflow-hidden'>
			<div className='flex h-[520px]'>
				{/* Sidebar — order list */}
				<div className='w-64 shrink-0 border-r border-border flex flex-col'>
					<div className='flex items-center gap-2 px-4 py-3 border-b border-border'>
						<MessageSquare className='w-4 h-4 text-primary' />
						<span className='text-sm font-semibold text-foreground'>
							Сообщения
						</span>
					</div>

					<div className='flex-1 overflow-y-auto'>
						{isLoading ? (
							<div className='space-y-1 p-2'>
								{[0, 1, 2].map(i => (
									<div
										key={i}
										className='h-14 rounded-xl bg-muted/50 animate-pulse'
									/>
								))}
							</div>
						) : orders.length === 0 ? (
							<div className='flex flex-col items-center justify-center h-full text-muted-foreground p-4'>
								<MessageCircle className='w-8 h-8 opacity-20 mb-2' />
								<p className='text-xs text-center'>Заказов нет</p>
							</div>
						) : (
							<div className='p-2 space-y-0.5'>
								{orders.map(order => {
									const cp = counterpart(order)
									const unread = unreadCounts[order.id] ?? 0
									const isSelected = selectedOrderId === order.id
									return (
										<button
											key={order.id}
											onClick={() => setSelectedOrderId(order.id)}
											className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3 ${
												isSelected
													? 'bg-primary/10 text-primary'
													: 'text-foreground hover:bg-muted/50'
											}`}
										>
											{/* Avatar */}
											<div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden'>
												{cp?.avatar ? (
													<img
														src={cp.avatar}
														alt={cp.name}
														className='w-full h-full object-cover'
													/>
												) : (
													(cp?.name ?? '?').charAt(0).toUpperCase()
												)}
											</div>
											<div className='flex-1 min-w-0'>
												<p className='text-xs font-medium truncate'>
													{cp?.name ?? 'Пользователь'}
												</p>
												<p className='text-[10px] text-muted-foreground truncate'>
													{order.service?.title ?? 'Услуга'}
												</p>
											</div>
											{unread > 0 && (
												<span className='shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold'>
													{unread > 9 ? '9+' : unread}
												</span>
											)}
										</button>
									)
								})}
							</div>
						)}
					</div>
				</div>

				{/* Chat area */}
				<div className='flex-1 flex flex-col min-w-0'>
					{selectedOrder ? (
						<>
							{/* Chat header */}
							<div className='flex items-center gap-3 px-4 py-3 border-b border-border shrink-0'>
								<div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden shrink-0'>
									{(() => {
										const cp = counterpart(selectedOrder)
										return cp?.avatar ? (
											<img
												src={cp.avatar}
												alt={cp.name}
												className='w-full h-full object-cover'
											/>
										) : (
											(cp?.name ?? '?').charAt(0).toUpperCase()
										)
									})()}
								</div>
								<div>
									<p className='text-sm font-medium text-foreground'>
										{counterpart(selectedOrder)?.name ?? 'Пользователь'}
									</p>
									<p className='text-xs text-muted-foreground'>
										{selectedOrder.service?.title}
										{' · '}
										<span
											className={`${STATUS_COLOR[selectedOrder.status]?.split(' ')[1] ?? ''}`}
										>
											{STATUS_LABEL[selectedOrder.status] ??
												selectedOrder.status}
										</span>
									</p>
								</div>
							</div>

							{/* Messages + Input — using ChatPane internals */}
							<InlineChatContent
								orderId={selectedOrder.id}
								currentUserId={currentUserId}
							/>
						</>
					) : (
						<div className='flex-1 flex flex-col items-center justify-center text-muted-foreground'>
							<MessageCircle className='w-12 h-12 opacity-20 mb-3' />
							<p className='text-sm font-medium text-foreground'>
								Выберите диалог
							</p>
							<p className='text-xs mt-1'>
								Чат по каждому заказу доступен слева
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
	{ value: 'mathematics', label: 'Математика' },
	{ value: 'economics', label: 'Экономика' },
	{ value: 'informatics', label: 'Информатика' },
	{ value: 'law', label: 'Юриспруденция' },
	{ value: 'history', label: 'История' },
	{ value: 'psychology', label: 'Психология' },
	{ value: 'physics', label: 'Физика' },
	{ value: 'chemistry', label: 'Химия' },
	{ value: 'biology', label: 'Биология' },
	{ value: 'engineering', label: 'Инженерия' },
	{ value: 'management', label: 'Менеджмент' },
	{ value: 'other', label: 'Другое' },
]

const LEVEL_OPTIONS: { value: ServiceLevel; label: string }[] = [
	{ value: 'bachelor', label: 'Бакалавриат' },
	{ value: 'specialist', label: 'Специалитет' },
	{ value: 'master', label: 'Магистратура' },
]

function ServiceCard({
	service,
	onDelete,
}: {
	service: Service
	onDelete: (id: string) => void
}) {
	return (
		<div className='p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors'>
			<div className='flex items-start justify-between gap-3'>
				<div className='flex-1 min-w-0'>
					<Link
						to='/services/$serviceId'
						params={{ serviceId: service.id }}
						className='font-medium text-foreground text-sm hover:text-primary transition-colors line-clamp-1'
					>
						{service.title}
					</Link>
					<p className='text-xs text-muted-foreground mt-0.5'>
						{SERVICE_CATEGORIES[service.category]} ·{' '}
						{SERVICE_LEVELS[service.level]}
					</p>
					{service.packages[0] && (
						<p className='text-xs text-foreground/70 mt-1'>
							от{' '}
							{new Intl.NumberFormat('ru-RU', {
								style: 'currency',
								currency: 'RUB',
								maximumFractionDigits: 0,
							}).format(service.packages[0].price)}
						</p>
					)}
				</div>
				<button
					onClick={() => onDelete(service.id)}
					className='shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
					title='Удалить услугу'
				>
					<Trash2 className='w-4 h-4' />
				</button>
			</div>
		</div>
	)
}

function ServicesTab({ freelancerId }: { freelancerId: string }) {
	const queryClient = useQueryClient()
	const [showForm, setShowForm] = useState(false)

	// ── form state ──
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [category, setCategory] = useState<ServiceCategory>('informatics')
	const [level, setLevel] = useState<ServiceLevel>('bachelor')
	const [tags, setTags] = useState('')
	// Single basic package
	const [pkgName, setPkgName] = useState('Базовый')
	const [pkgPrice, setPkgPrice] = useState('')
	const [pkgDays, setPkgDays] = useState('')
	const [pkgRevisions, setPkgRevisions] = useState('1')
	const [pkgDesc, setPkgDesc] = useState('')
	const [formError, setFormError] = useState('')

	const { data: services = [], isLoading } = useQuery({
		queryKey: ['my-services', freelancerId],
		queryFn: () => getMyServices(freelancerId),
		enabled: !!freelancerId,
	})

	const { mutate: removeService } = useMutation({
		mutationFn: deleteService,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ['my-services', freelancerId],
			}),
		onError: (err: unknown) => {
			setFormError(extractApiError(err, 'Не удалось удалить услугу'))
		},
	})

	const { mutate: submitService, isPending: creating } = useMutation({
		mutationFn: (payload: CreateServicePayload) => createService(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['my-services', freelancerId] })
			setShowForm(false)
			resetForm()
		},
		onError: (err: unknown) => {
			setFormError(extractApiError(err, 'Ошибка при создании'))
		},
	})

	function resetForm() {
		setTitle('')
		setDescription('')
		setCategory('informatics')
		setLevel('bachelor')
		setTags('')
		setPkgName('Базовый')
		setPkgPrice('')
		setPkgDays('')
		setPkgRevisions('1')
		setPkgDesc('')
		setFormError('')
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setFormError('')
		if (!title.trim()) return setFormError('Введите название услуги')
		if (!description.trim()) return setFormError('Введите описание')
		if (!pkgPrice || isNaN(Number(pkgPrice)) || Number(pkgPrice) <= 0)
			return setFormError('Введите корректную цену пакета')
		if (!pkgDays || isNaN(Number(pkgDays)) || Number(pkgDays) <= 0)
			return setFormError('Введите количество дней')

		submitService({
			title: title.trim(),
			description: description.trim(),
			category: category.toUpperCase(),
			level: level.toUpperCase(),
			tags: tags
				.split(',')
				.map(t => t.trim())
				.filter(Boolean),
			packages: [
				{
					name: pkgName.trim() || 'Базовый',
					price: Math.round(Number(pkgPrice) * 100), // rub → kopecks
					deliveryDays: Number(pkgDays),
					revisions: Number(pkgRevisions) || 1,
					description: pkgDesc.trim() || undefined,
				},
			],
		})
	}

	return (
		<div className='space-y-4'>
			<div className='glass-card rounded-2xl p-6'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='font-semibold text-foreground'>Мои услуги</h2>
					{!showForm && (
						<button
							onClick={() => setShowForm(true)}
							className='flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium'
						>
							<Plus className='w-4 h-4' />
							Создать услугу
						</button>
					)}
				</div>

				{showForm && (
					<form
						onSubmit={handleSubmit}
						className='mb-6 p-4 rounded-xl border border-border bg-muted/20 space-y-4'
					>
						<div className='flex items-center justify-between'>
							<p className='font-medium text-sm text-foreground'>
								Новая услуга
							</p>
							<button
								type='button'
								onClick={() => {
									setShowForm(false)
									resetForm()
								}}
								className='p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground'
							>
								<X className='w-4 h-4' />
							</button>
						</div>

						<div>
							<label className='block text-xs font-medium text-foreground mb-1'>
								Название <span className='text-destructive'>*</span>
							</label>
							<input
								value={title}
								onChange={e => setTitle(e.target.value)}
								maxLength={100}
								placeholder='Написание курсовой по информатике'
								className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
							/>
						</div>

						<div>
							<label className='block text-xs font-medium text-foreground mb-1'>
								Описание <span className='text-destructive'>*</span>
							</label>
							<textarea
								value={description}
								onChange={e => setDescription(e.target.value)}
								rows={3}
								placeholder='Подробно опишите, что вы предлагаете...'
								className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none'
							/>
						</div>

						<div className='grid sm:grid-cols-2 gap-3'>
							<div>
								<label className='block text-xs font-medium text-foreground mb-1'>
									Категория
								</label>
								<select
									value={category}
									onChange={e => setCategory(e.target.value as ServiceCategory)}
									className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								>
									{CATEGORY_OPTIONS.map(o => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className='block text-xs font-medium text-foreground mb-1'>
									Уровень
								</label>
								<select
									value={level}
									onChange={e => setLevel(e.target.value as ServiceLevel)}
									className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								>
									{LEVEL_OPTIONS.map(o => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
						</div>

						<div>
							<label className='block text-xs font-medium text-foreground mb-1'>
								Теги (через запятую)
							</label>
							<input
								value={tags}
								onChange={e => setTags(e.target.value)}
								placeholder='курсовая, диплом, C++'
								className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
							/>
						</div>

						{/* Package */}
						<div className='p-3 rounded-lg border border-dashed border-border space-y-3'>
							<p className='text-xs font-semibold text-foreground'>
								Пакет услуги
							</p>
							<div className='grid sm:grid-cols-2 gap-3'>
								<div>
									<label className='block text-xs text-muted-foreground mb-1'>
										Название пакета
									</label>
									<input
										value={pkgName}
										onChange={e => setPkgName(e.target.value)}
										placeholder='Базовый'
										className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
									/>
								</div>
								<div>
									<label className='block text-xs text-muted-foreground mb-1'>
										Цена (₽) <span className='text-destructive'>*</span>
									</label>
									<input
										type='number'
										min='1'
										value={pkgPrice}
										onChange={e => setPkgPrice(e.target.value)}
										placeholder='3000'
										className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
									/>
								</div>
								<div>
									<label className='block text-xs text-muted-foreground mb-1'>
										Срок (дней) <span className='text-destructive'>*</span>
									</label>
									<input
										type='number'
										min='1'
										value={pkgDays}
										onChange={e => setPkgDays(e.target.value)}
										placeholder='7'
										className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
									/>
								</div>
								<div>
									<label className='block text-xs text-muted-foreground mb-1'>
										Правок
									</label>
									<input
										type='number'
										min='0'
										value={pkgRevisions}
										onChange={e => setPkgRevisions(e.target.value)}
										placeholder='1'
										className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
									/>
								</div>
							</div>
							<div>
								<label className='block text-xs text-muted-foreground mb-1'>
									Что входит в пакет
								</label>
								<input
									value={pkgDesc}
									onChange={e => setPkgDesc(e.target.value)}
									placeholder='Базовый объём работы...'
									className='w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								/>
							</div>
						</div>

						{formError && (
							<p className='text-xs text-destructive'>{formError}</p>
						)}

						<div className='flex gap-2'>
							<button
								type='submit'
								disabled={creating}
								className='flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors'
							>
								{creating ? 'Создаём...' : 'Создать услугу'}
							</button>
							<button
								type='button'
								onClick={() => {
									setShowForm(false)
									resetForm()
								}}
								className='px-5 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors'
							>
								Отмена
							</button>
						</div>
					</form>
				)}

				{isLoading ? (
					<div className='space-y-3'>
						{[0, 1, 2].map(i => (
							<div
								key={i}
								className='h-16 bg-muted/50 rounded-xl animate-pulse'
							/>
						))}
					</div>
				) : services.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
						<Briefcase className='w-12 h-12 opacity-20 mb-3' />
						<p className='text-sm'>У вас ещё нет услуг</p>
						{!showForm && (
							<button
								onClick={() => setShowForm(true)}
								className='mt-4 text-sm text-primary hover:underline'
							>
								Создать первую услугу →
							</button>
						)}
					</div>
				) : (
					<div className='space-y-3'>
						{services.map(service => (
							<ServiceCard
								key={service.id}
								service={service}
								onDelete={removeService}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

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

function ReviewsTab({ role }: { role: string }) {
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

function SettingsTab() {
	const { user, updateUser } = useAuthStore()
	const [name, setName] = useState(user?.name ?? '')
	const [bio, setBio] = useState((user as { bio?: string })?.bio ?? '')
	const [telegram, setTelegram] = useState(
		(user as { telegram?: string })?.telegram ?? '',
	)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)
	const [error, setError] = useState('')

	const isFreelancer = user?.role === 'freelancer'

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim()) {
			setError('Имя не может быть пустым')
			return
		}
		setError('')
		setSaving(true)
		try {
			await updateMeApi({ name: name.trim() })
			if (isFreelancer) {
				await updateProfileApi({
					bio: bio.trim() || undefined,
					telegram: telegram.trim() || undefined,
				})
			}
			updateUser({ name: name.trim() })
			setSaved(true)
			setTimeout(() => setSaved(false), 3000)
		} catch (err: unknown) {
			setError(extractApiError(err, 'Не удалось сохранить изменения'))
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className='glass-card rounded-2xl p-6'>
			<h2 className='font-semibold text-foreground mb-6'>Настройки профиля</h2>
			<form onSubmit={handleSave} className='space-y-4 max-w-md'>
				<div>
					<label
						htmlFor='settings-name'
						className='block text-sm font-medium text-foreground mb-1.5'
					>
						Имя
					</label>
					<input
						id='settings-name'
						name='name'
						type='text'
						value={name}
						onChange={e => setName(e.target.value)}
						className='w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
						placeholder='Ваше имя'
					/>
				</div>

				{isFreelancer && (
					<>
						<div>
							<label
								htmlFor='settings-bio'
								className='block text-sm font-medium text-foreground mb-1.5'
							>
								О себе
							</label>
							<textarea
								id='settings-bio'
								name='bio'
								value={bio}
								onChange={e => setBio(e.target.value)}
								rows={3}
								maxLength={500}
								className='w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none'
								placeholder='Расскажите о своём опыте...'
							/>
							<p className='text-xs text-muted-foreground mt-1 text-right'>
								{bio.length}/500
							</p>
						</div>

						<div>
							<label
								htmlFor='settings-telegram'
								className='block text-sm font-medium text-foreground mb-1.5'
							>
								Telegram
							</label>
							<input
								id='settings-telegram'
								name='telegram'
								type='text'
								value={telegram}
								onChange={e => setTelegram(e.target.value)}
								className='w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								placeholder='@username'
							/>
						</div>
					</>
				)}

				{error && <p className='text-xs text-destructive'>{error}</p>}

				<button
					type='submit'
					disabled={saving}
					className='flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors'
				>
					{saved ? (
						<>
							<Check className='w-4 h-4' /> Сохранено
						</>
					) : saving ? (
						'Сохранение...'
					) : (
						'Сохранить изменения'
					)}
				</button>
			</form>
		</div>
	)
}

export default function DashboardPage() {
	const { user, logout } = useAuthStore()
	const [activeTab, setActiveTab] = useState<TabId>('orders')

	const { data: orders = [], isLoading: ordersLoading } = useQuery({
		queryKey: ['my-orders'],
		queryFn: getMyOrders,
		enabled: !!user,
	})

	const { data: unreadCounts = {} } = useQuery({
		queryKey: ['unread-counts'],
		queryFn: getUnreadCounts,
		enabled: !!user,
		refetchInterval: 20000,
	})

	const activeCount = orders.filter(
		o => o.status === 'pending' || o.status === 'in_progress',
	).length
	const completedCount = orders.filter(o => o.status === 'completed').length

	if (!user) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<p className='text-muted-foreground mb-4'>Вы не авторизованы</p>
					<Link
						to='/login'
						className='inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
					>
						Войти
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			<div className='container-custom py-8'>
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					className='grid lg:grid-cols-[280px_1fr] gap-6'
				>
					{/* Sidebar */}
					<aside className='space-y-4'>
						<div className='glass-card rounded-2xl p-6'>
							<div className='flex flex-col items-center text-center'>
								<div className='w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-3'>
									{user.avatar ? (
										<img
											src={user.avatar}
											alt={user.name}
											className='w-full h-full rounded-full object-cover'
										/>
									) : (
										getInitials(user.name)
									)}
								</div>
								<h2 className='font-semibold text-foreground'>{user.name}</h2>
								<p className='text-sm text-muted-foreground'>{user.email}</p>
								<span className='mt-2 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium'>
									{user.role === 'student' ? 'Заказчик' : 'Исполнитель'}
								</span>
							</div>
						</div>

						<nav className='glass-card rounded-2xl p-2'>
							{tabs
								.filter(
									tab => !tab.freelancerOnly || user.role === 'freelancer',
								)
								.map(tab => {
									const Icon = tab.icon
									const isActive = activeTab === tab.id
									return (
										<button
											key={tab.id}
											onClick={() => setActiveTab(tab.id)}
											className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors text-left ${
												isActive
													? 'bg-primary/10 text-primary font-medium'
													: 'text-muted-foreground hover:text-foreground hover:bg-muted'
											}`}
										>
											<Icon className='w-4 h-4' />
											{tab.label}
										</button>
									)
								})}
							<button
								onClick={logout}
								className='w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors text-left mt-1'
							>
								<LogOut className='w-4 h-4' />
								Выйти
							</button>
						</nav>
					</aside>

					{/* Main */}
					<main className='space-y-6'>
						<AnimatePresence mode='wait'>
							{activeTab === 'orders' && (
								<motion.div
									key='orders'
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.2 }}
									className='space-y-6'
								>
									<div className='glass-card rounded-2xl p-6'>
										<div className='flex items-center gap-3 mb-4'>
											<LayoutDashboard className='w-5 h-5 text-primary' />
											<h1 className='text-xl font-bold text-foreground'>
												Обзор
											</h1>
										</div>
										{ordersLoading ? (
											<div className='grid sm:grid-cols-3 gap-4'>
												{[0, 1, 2].map(i => (
													<div
														key={i}
														className='bg-muted/50 rounded-xl p-4 animate-pulse h-16'
													/>
												))}
											</div>
										) : (
											<div className='grid sm:grid-cols-3 gap-4'>
												<div className='bg-muted/50 rounded-xl p-4'>
													<p className='text-2xl font-bold text-foreground'>
														{activeCount}
													</p>
													<p className='text-sm text-muted-foreground mt-1'>
														Активных заказов
													</p>
												</div>
												<div className='bg-muted/50 rounded-xl p-4'>
													<p className='text-2xl font-bold text-foreground'>
														{completedCount}
													</p>
													<p className='text-sm text-muted-foreground mt-1'>
														Завершённых
													</p>
												</div>
												<div className='bg-muted/50 rounded-xl p-4'>
													<p className='text-2xl font-bold text-foreground'>
														{orders.length}
													</p>
													<p className='text-sm text-muted-foreground mt-1'>
														Всего заказов
													</p>
												</div>
											</div>
										)}
									</div>

									<div className='glass-card rounded-2xl p-6'>
										<h2 className='font-semibold text-foreground mb-4'>
											Последние заказы
										</h2>
										{ordersLoading ? (
											<div className='space-y-3'>
												{[0, 1, 2].map(i => (
													<div
														key={i}
														className='h-20 bg-muted/50 rounded-xl animate-pulse'
													/>
												))}
											</div>
										) : orders.length === 0 ? (
											<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
												<ShoppingBag className='w-12 h-12 opacity-20 mb-3' />
												<p className='text-sm'>Заказов пока нет</p>
												<Link
													to='/services'
													className='mt-4 text-sm text-primary hover:underline'
												>
													Найти исполнителя →
												</Link>
											</div>
										) : (
											<div className='space-y-3'>
												{orders.slice(0, 10).map(order => (
													<OrderCard
														key={order.id}
														order={order}
														role={user.role}
														currentUserId={user.id}
														unread={unreadCounts[order.id] ?? 0}
													/>
												))}
											</div>
										)}
									</div>
								</motion.div>
							)}

							{activeTab === 'services' && (
								<motion.div
									key='services'
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.2 }}
								>
									<ServicesTab freelancerId={user.id} />
								</motion.div>
							)}

							{activeTab === 'messages' && (
								<motion.div
									key='messages'
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.2 }}
								>
									<MessagesTab currentUserId={user.id} userRole={user.role} />
								</motion.div>
							)}

							{activeTab === 'reviews' && (
								<motion.div
									key='reviews'
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.2 }}
								>
									<ReviewsTab role={user.role} />
								</motion.div>
							)}

							{activeTab === 'settings' && (
								<motion.div
									key='settings'
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.2 }}
								>
									<SettingsTab />
								</motion.div>
							)}
						</AnimatePresence>
					</main>
				</motion.div>
			</div>
		</div>
	)
}
