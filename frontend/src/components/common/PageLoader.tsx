import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'

export default function PageLoader() {
	return (
		<div className='fixed inset-0 z-[100] flex items-center justify-center bg-background'>
			<motion.div
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				className='flex flex-col items-center gap-4'
			>
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
					className='flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg'
				>
					<BookOpen className='h-7 w-7 text-primary-foreground' />
				</motion.div>
				<motion.div
					initial={{ width: 0 }}
					animate={{ width: '100%' }}
					transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
					className='h-0.5 w-32 rounded-full bg-primary/40 overflow-hidden'
				>
					<motion.div
						animate={{ x: ['-100%', '100%'] }}
						transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
						className='h-full w-1/2 bg-primary rounded-full'
					/>
				</motion.div>
				<p className='text-sm text-muted-foreground font-medium'>Загрузка...</p>
			</motion.div>
		</div>
	)
}
