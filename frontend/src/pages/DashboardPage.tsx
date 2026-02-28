import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
	LayoutDashboard,
	LogOut,
	MessageSquare,
	Settings,
	ShoppingBag,
	Star,
} from 'lucide-react'

const tabs = [
	{ id: 'orders', label: 'Мои заказы', icon: ShoppingBag },
	{ id: 'messages', label: 'Сообщения', icon: MessageSquare },
	{ id: 'reviews', label: 'Отзывы', icon: Star },
	{ id: 'settings', label: 'Настройки', icon: Settings },
]

export default function DashboardPage() {
	const { user, logout } = useAuthStore()

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
								return (
									<button
										key={tab.id}
										className='w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left'
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
					<main>
						<div className='glass-card rounded-2xl p-6 mb-6'>
							<div className='flex items-center gap-3 mb-4'>
								<LayoutDashboard className='w-5 h-5 text-primary' />
								<h1 className='text-xl font-bold text-foreground'>Обзор</h1>
							</div>
							<div className='grid sm:grid-cols-3 gap-4'>
								{[
									{ label: 'Активных заказов', value: '0' },
									{ label: 'Завершённых', value: '0' },
									{ label: 'Средняя оценка', value: '—' },
								].map(stat => (
									<div key={stat.label} className='bg-muted/50 rounded-xl p-4'>
										<p className='text-2xl font-bold text-foreground'>
											{stat.value}
										</p>
										<p className='text-sm text-muted-foreground mt-1'>
											{stat.label}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className='glass-card rounded-2xl p-6'>
							<h2 className='font-semibold text-foreground mb-4'>
								Последние заказы
							</h2>
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
						</div>
					</main>
				</motion.div>
			</div>
		</div>
	)
}
