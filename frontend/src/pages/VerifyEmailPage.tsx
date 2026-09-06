import { verifyEmailApi } from '@/api/auth'
import { extractApiError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Link, useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircle2, Home, Loader2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Status = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
	const { token } = useSearch({ strict: false }) as { token?: string }
	const updateUser = useAuthStore(s => s.updateUser)
	// Отсутствие токена видно сразу при рендере — незачем гонять эффект,
	// чтобы поставить состояние, известное заранее
	const [status, setStatus] = useState<Status>(token ? 'loading' : 'error')
	const [message, setMessage] = useState(
		token ? '' : 'Ссылка некорректна: отсутствует токен подтверждения.',
	)
	const called = useRef(false)

	useEffect(() => {
		if (!token || called.current) return
		called.current = true

		verifyEmailApi(token)
			.then(res => {
				setStatus('success')
				setMessage(res.message ?? 'Email успешно подтверждён.')
				updateUser({ emailVerified: true })
			})
			.catch(err => {
				setStatus('error')
				setMessage(
					extractApiError(
						err,
						'Не удалось подтвердить email. Возможно, ссылка устарела.',
					),
				)
			})
	}, [token, updateUser])

	return (
		<div className='min-h-screen flex items-center justify-center bg-background px-4'>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className='text-center max-w-md'
			>
				{status === 'loading' && (
					<>
						<Loader2 className='w-14 h-14 mx-auto mb-6 text-primary animate-spin' />
						<h1 className='text-2xl font-bold text-foreground mb-3'>
							Подтверждаем email…
						</h1>
						<p className='text-muted-foreground'>Это займёт пару секунд.</p>
					</>
				)}

				{status === 'success' && (
					<>
						<CheckCircle2 className='w-16 h-16 mx-auto mb-6 text-green-500' />
						<h1 className='text-2xl font-bold text-foreground mb-3'>
							Email подтверждён
						</h1>
						<p className='text-muted-foreground mb-8'>{message}</p>
						<div className='flex flex-col sm:flex-row gap-3 justify-center'>
							<Link
								to='/dashboard'
								className='inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
							>
								В личный кабинет
							</Link>
							<Link
								to='/'
								className='inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors'
							>
								<Home className='w-4 h-4' />
								На главную
							</Link>
						</div>
					</>
				)}

				{status === 'error' && (
					<>
						<XCircle className='w-16 h-16 mx-auto mb-6 text-destructive' />
						<h1 className='text-2xl font-bold text-foreground mb-3'>
							Не удалось подтвердить
						</h1>
						<p className='text-muted-foreground mb-8'>{message}</p>
						<div className='flex flex-col sm:flex-row gap-3 justify-center'>
							<Link
								to='/dashboard'
								className='inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
							>
								В личный кабинет
							</Link>
							<Link
								to='/'
								className='inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors'
							>
								<Home className='w-4 h-4' />
								На главную
							</Link>
						</div>
					</>
				)}
			</motion.div>
		</div>
	)
}
