import { loginApi } from '@/api/auth'
import { extractApiError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Lock, LogIn, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const loginSchema = z.object({
	email: z.string().email('Введите корректный email'),
	password: z
		.string()
		.min(8, 'Пароль должен содержать минимум 8 символов')
		.max(72, 'Пароль не должен превышать 72 символа'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
	const { setUser } = useAuthStore()
	const navigate = useNavigate()
	const { redirect } = useSearch({ strict: false }) as { redirect?: string }
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

	const onSubmit = async (data: LoginForm) => {
		try {
			const result = await loginApi(data.email, data.password)
			setUser(result.user, result.accessToken)
			toast.success('Добро пожаловать!')
			const safePath = redirect && redirect.startsWith('/') ? redirect : '/'
			await navigate({ to: safePath })
		} catch (err: unknown) {
			const msg = extractApiError(err, 'Неверный email или пароль')
			setError('root', { message: msg })
		}
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-background px-4 py-12'>
			<div className='w-full max-w-md'>
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					className='glass-card rounded-2xl p-8'
				>
					<div className='text-center mb-8'>
						<div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4'>
							<LogIn className='w-6 h-6 text-primary' />
						</div>
						<h1 className='text-2xl font-bold text-foreground'>
							Войти в аккаунт
						</h1>
						<p className='text-muted-foreground mt-1 text-sm'>
							Нет аккаунта?{' '}
							<Link
								to='/register'
								className='text-primary hover:underline font-medium'
							>
								Зарегистрироваться
							</Link>
						</p>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
						<div>
							<label className='block text-sm font-medium text-foreground mb-1.5'>
								Email
							</label>
							<div className='relative'>
								<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<input
									{...register('email')}
									type='email'
									autoComplete='email'
									placeholder='you@example.com'
									className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								/>
							</div>
							{errors.email && (
								<p className='text-destructive text-xs mt-1'>
									{errors.email.message}
								</p>
							)}
						</div>

						<div>
							<label className='block text-sm font-medium text-foreground mb-1.5'>
								Пароль
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<input
									{...register('password')}
									type='password'
									autoComplete='current-password'
									placeholder='••••••••'
									className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								/>
							</div>
							{errors.password && (
								<p className='text-destructive text-xs mt-1'>
									{errors.password.message}
								</p>
							)}
						</div>

						{errors.root && (
							<p className='text-destructive text-sm text-center bg-destructive/10 rounded-lg px-3 py-2'>
								{errors.root.message}
							</p>
						)}

						<button
							type='submit'
							disabled={isSubmitting}
							className='w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors'
						>
							{isSubmitting ? 'Входим...' : 'Войти'}
						</button>
					</form>

					<p className='text-center text-xs text-muted-foreground mt-6'>
						Для теста: student@cursovai.ru / Password123!
					</p>
				</motion.div>
			</div>
		</div>
	)
}
