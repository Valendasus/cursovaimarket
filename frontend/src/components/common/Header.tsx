import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	BookOpen,
	ChevronDown,
	LayoutDashboard,
	LogOut,
	Menu,
	User,
	X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const navLinks = [
	{
		label: 'Как это работает',
		href: '/#how-it-works',
		isRoute: false,
		anchor: 'how-it-works',
	},
	{ label: 'Услуги', href: '/services', isRoute: true },
	{ label: 'Исполнители', href: '/freelancers', isRoute: true },
]

export default function Header() {
	const [isScrolled, setIsScrolled] = useState(false)
	const [isVisible, setIsVisible] = useState(true)
	const [mobileOpen, setMobileOpen] = useState(false)
	const lastScrollY = useRef(0)
	const { user, isAuthenticated, logout } = useAuthStore()

	useEffect(() => {
		const handleScroll = () => {
			const currentY = window.scrollY
			setIsScrolled(currentY > 20)
			if (currentY < 10) {
				setIsVisible(true)
			} else if (currentY > lastScrollY.current + 6) {
				setIsVisible(false)
				setMobileOpen(false)
			} else if (currentY < lastScrollY.current - 4) {
				setIsVisible(true)
			}
			lastScrollY.current = currentY
		}
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	return (
		<motion.header
			animate={{ y: isVisible ? 0 : '-100%' }}
			transition={{ duration: 0.25, ease: 'easeInOut' }}
			className={cn(
				'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
				isScrolled
					? 'bg-background/90 backdrop-blur-xl border-b border-border shadow-sm'
					: 'bg-transparent',
			)}
		>
			<div className='container-custom'>
				<div className='flex h-16 items-center justify-between'>
					{/* Logo */}
					<Link to='/' className='flex items-center gap-2 group'>
						<div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg group-hover:shadow-primary/40 transition-shadow'>
							<BookOpen className='h-5 w-5 text-primary-foreground' />
						</div>
						<span className='text-lg font-bold text-foreground'>
							Курсовой<span className='text-primary'>Маркет</span>
						</span>
					</Link>

					{/* Desktop Nav */}
					<nav className='hidden md:flex items-center gap-1'>
						{navLinks.map(link =>
							link.isRoute ? (
								<Link
									key={link.href}
									to={link.href}
									className={cn(
										'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
										'text-muted-foreground hover:text-foreground hover:bg-accent',
									)}
								>
									{link.label}
								</Link>
							) : (
								<a
									key={link.href}
									href={link.href}
									onClick={e => {
										if (link.anchor) {
											const el = document.getElementById(link.anchor)
											if (el) {
												e.preventDefault()
												el.scrollIntoView({
													behavior: 'smooth',
													block: 'start',
												})
											}
										}
									}}
									className={cn(
										'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
										'text-muted-foreground hover:text-foreground hover:bg-accent',
									)}
								>
									{link.label}
								</a>
							),
						)}
					</nav>

					{/* Auth / User */}
					<div className='hidden md:flex items-center gap-3'>
						{isAuthenticated && user ? (
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<button className='flex items-center gap-2 rounded-full pr-3 pl-1 py-1 hover:bg-accent transition-colors'>
										<Avatar className='h-8 w-8'>
											<AvatarImage src={user.avatar} alt={user.name} />
											<AvatarFallback className='bg-primary text-primary-foreground text-xs'>
												{getInitials(user.name)}
											</AvatarFallback>
										</Avatar>
										<span className='text-sm font-medium'>
											{user.name.split(' ')[0]}
										</span>
										<ChevronDown className='h-4 w-4 text-muted-foreground' />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end' className='w-48'>
									<DropdownMenuItem asChild>
										<Link
											to='/dashboard'
											search={{}}
											className='flex items-center gap-2'
										>
											<LayoutDashboard className='h-4 w-4' />
											Личный кабинет
										</Link>
									</DropdownMenuItem>
									{user.role === 'freelancer' && (
										<DropdownMenuItem asChild>
											<Link
												to='/freelancers/$freelancerId'
												params={{ freelancerId: user.id }}
												className='flex items-center gap-2'
											>
												<User className='h-4 w-4' />
												Мой профиль
											</Link>
										</DropdownMenuItem>
									)}
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className='text-destructive focus:text-destructive'
										onClick={logout}
									>
										<LogOut className='h-4 w-4 mr-2' />
										Выйти
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<>
								<Button variant='ghost' size='sm' asChild>
									<Link to='/login'>Войти</Link>
								</Button>
								<Button size='sm' asChild>
									<Link to='/register'>Начать</Link>
								</Button>
							</>
						)}
					</div>

					{/* Mobile toggle */}
					<button
						className='md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors'
						onClick={() => setMobileOpen(!mobileOpen)}
						aria-label='Меню'
					>
						{mobileOpen ? (
							<X className='h-5 w-5' />
						) : (
							<Menu className='h-5 w-5' />
						)}
					</button>
				</div>
			</div>

			{/* Mobile Menu */}
			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.2 }}
						className='md:hidden border-t border-border bg-background/95 backdrop-blur-xl overflow-hidden'
					>
						<div className='container-custom py-4 flex flex-col gap-1'>
							{navLinks.map(link =>
								link.isRoute ? (
									<Link
										key={link.href}
										to={link.href}
										onClick={() => setMobileOpen(false)}
										className='px-4 py-3 text-sm font-medium rounded-lg hover:bg-accent transition-colors'
									>
										{link.label}
									</Link>
								) : (
									<a
										key={link.href}
										href={link.href}
										onClick={e => {
											setMobileOpen(false)
											if (link.anchor) {
												const el = document.getElementById(link.anchor)
												if (el) {
													e.preventDefault()
													el.scrollIntoView({
														behavior: 'smooth',
														block: 'start',
													})
												}
											}
										}}
										className='px-4 py-3 text-sm font-medium rounded-lg hover:bg-accent transition-colors'
									>
										{link.label}
									</a>
								),
							)}
							<div className='flex gap-2 mt-3 pt-3 border-t border-border'>
								{isAuthenticated ? (
									<>
										<Button variant='outline' className='flex-1' asChild>
											<Link
												to='/dashboard'
												search={{}}
												onClick={() => setMobileOpen(false)}
											>
												Кабинет
											</Link>
										</Button>
										<Button variant='ghost' className='flex-1' onClick={logout}>
											Выйти
										</Button>
									</>
								) : (
									<>
										<Button variant='outline' className='flex-1' asChild>
											<Link to='/login' onClick={() => setMobileOpen(false)}>
												Войти
											</Link>
										</Button>
										<Button className='flex-1' asChild>
											<Link to='/register' onClick={() => setMobileOpen(false)}>
												Начать
											</Link>
										</Button>
									</>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.header>
	)
}
