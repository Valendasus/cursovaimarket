import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Home, Search } from 'lucide-react'

export default function NotFoundPage() {
	return (
		<div className='min-h-screen flex items-center justify-center bg-background px-4'>
			<div className='text-center max-w-md'>
				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5, type: 'spring' }}
					className='mb-8'
				>
					<span className='text-[120px] font-bold text-gradient leading-none block'>
						404
					</span>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, duration: 0.5 }}
				>
					<h1 className='text-2xl font-bold text-foreground mb-3'>
						Страница не найдена
					</h1>
					<p className='text-muted-foreground mb-8'>
						Похоже, эта страница была перемещена или больше не существует.
						Проверьте адрес или вернитесь на главную.
					</p>

					<div className='flex flex-col sm:flex-row gap-3 justify-center'>
						<Link
							to='/'
							className='inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
						>
							<Home className='w-4 h-4' />
							На главную
						</Link>
						<Link
							to='/services'
							className='inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors'
						>
							<Search className='w-4 h-4' />
							Найти услугу
						</Link>
					</div>
				</motion.div>
			</div>
		</div>
	)
}
