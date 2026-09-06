import { getMyOrders } from '@/api/orders'
import { OrderCard } from '@/features/dashboard/OrderCard'
import { PaymentModeBanner } from '@/features/dashboard/PaymentModeBanner'
import { MessagesTab } from '@/features/dashboard/MessagesTab'
import { ReviewsTab } from '@/features/dashboard/ReviewsTab'
import { ServicesTab } from '@/features/dashboard/ServicesTab'
import { SettingsTab } from '@/features/dashboard/SettingsTab'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	Briefcase,
	LayoutDashboard,
	LogOut,
	MessageSquare,
	Settings,
	ShoppingBag,
	Star,
} from 'lucide-react'
import { useState } from 'react'

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

export default function DashboardPage() {
	const { user, logout } = useAuthStore()
	const navigate = useNavigate()
	const search = useSearch({ from: '/dashboard' })
	const initialPartnerId = search.partnerId
	const tabFromSearch: TabId = (
		['orders', 'services', 'messages', 'reviews', 'settings'] as TabId[]
	).includes(search.tab as TabId)
		? (search.tab as TabId)
		: 'orders'
	const activeTab = tabFromSearch
	const [ordersLimit, setOrdersLimit] = useState(10)

	const { data: orders = [], isLoading: ordersLoading } = useQuery({
		queryKey: ['my-orders'],
		queryFn: getMyOrders,
		enabled: !!user,
		refetchInterval: 15000,
		refetchOnWindowFocus: true,
		refetchOnMount: true,
	})

	// Активен любой незакрытый заказ. Перечислять статусы поимённо нельзя:
	// раньше так выпадали review и revision, а с появлением подтверждения
	// выпал бы и accepted — оплаченный заказ исчезал бы из счётчика.
	const activeCount = orders.filter(
		o => o.status !== 'completed' && o.status !== 'cancelled',
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
		<div className='bg-background'>
			<div className='container-custom pt-24 pb-8'>
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					className={`grid gap-6 ${
						activeTab === 'messages'
							? 'grid-cols-1'
							: 'lg:grid-cols-[280px_1fr]'
					}`}
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
										user.name.charAt(0).toUpperCase()
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
											onClick={() => {
												void navigate({
													to: '/dashboard',
													search: prev => ({ ...prev, tab: tab.id }),
												})
											}}
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
					<main className='space-y-6 min-w-0 overflow-x-hidden'>
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
										<div className='mb-4'>
											<PaymentModeBanner />
										</div>
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
												{orders.slice(0, ordersLimit).map(order => (
													<OrderCard
														key={order.id}
														order={order}
														role={user.role}
														currentUserId={user.id}
													/>
												))}
												{orders.length > ordersLimit && (
													<button
														onClick={() => setOrdersLimit(l => l + 10)}
														className='w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors'
													>
														Показать ещё ({orders.length - ordersLimit} из{' '}
														{orders.length})
													</button>
												)}
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
									<MessagesTab
										currentUserId={user.id}
										initialPartnerId={initialPartnerId}
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
