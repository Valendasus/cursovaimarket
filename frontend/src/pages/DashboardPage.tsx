import { updateMeApi, updateProfileApi } from '@/api/auth'
import type { Order } from '@/api/orders'
import { getMyOrders } from '@/api/orders'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	Check,
	Clock,
	LayoutDashboard,
	LogOut,
	MessageSquare,
	Settings,
	ShoppingBag,
	Star,
} from 'lucide-react'
import { useState } from 'react'

type TabId = 'orders' | 'messages' | 'reviews' | 'settings'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
	{ id: 'orders', label: 'Мои заказы', icon: ShoppingBag },
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

function OrderCard({ order }: { order: Order }) {
	return (
		<div className='flex items-start justify-between gap-4 p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors'>
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
	)
}

function PlaceholderTab({
	icon: Icon,
	title,
	description,
}: {
	icon: React.ElementType
	title: string
	description: string
}) {
	return (
		<div className='glass-card rounded-2xl p-6'>
			<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
				<Icon className='w-12 h-12 opacity-20 mb-3' />
				<p className='text-sm font-medium text-foreground'>{title}</p>
				<p className='text-xs text-muted-foreground mt-1'>{description}</p>
			</div>
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
		} catch {
			setError('Не удалось сохранить изменения')
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
							{tabs.map(tab => {
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
													<OrderCard key={order.id} order={order} />
												))}
											</div>
										)}
									</div>
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
									<PlaceholderTab
										icon={MessageSquare}
										title='Сообщения'
										description='Чат с исполнителями появится в следующей версии'
									/>
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
									<PlaceholderTab
										icon={Star}
										title='Ваши отзывы'
										description='Здесь будут отображаться отзывы о заказах'
									/>
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
