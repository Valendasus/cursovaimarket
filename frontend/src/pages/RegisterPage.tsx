import { registerApi } from '@/api/auth'
import { extractApiError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Lock, Mail, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const registerSchema = z
	.object({
		name: z.string().min(2, 'Никнейм должен содержать минимум 2 символа'),
		email: z.string().email('Введите корректный email'),
		password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
		confirmPassword: z.string(),
	})
	.refine(d => d.password === d.confirmPassword, {
		message: 'Пароли не совпадают',
		path: ['confirmPassword'],
	})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
	const [role, setRole] = useState<'student' | 'freelancer'>('student')
	const { setUser } = useAuthStore()
	const navigate = useNavigate()

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

	const onSubmit = async (data: RegisterForm) => {
		try {
			const backendRole = role === 'freelancer' ? 'FREELANCER' : 'STUDENT'
			const result = await registerApi(
				data.name,
				data.email,
				data.password,
				backendRole,
			)
			setUser(result.user, result.accessToken)
			toast.success('Аккаунт создан! Добро пожаловать 🎉')
			await navigate({ to: '/' })
		} catch (err: unknown) {
			const msg = extractApiError(err, 'Ошибка регистрации')
			if (msg.includes('никнеймом')) {
				setError('name', { message: msg })
			} else {
				setError('email', { message: msg })
			}
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
							<UserPlus className='w-6 h-6 text-primary' />
						</div>
						<h1 className='text-2xl font-bold text-foreground'>
							Создать аккаунт
						</h1>
						<p className='text-muted-foreground mt-1 text-sm'>
							Уже есть аккаунт?{' '}
							<Link
								to='/login'
								className='text-primary hover:underline font-medium'
							>
								Войти
							</Link>
						</p>
					</div>

					{/* Role picker */}
					<div className='grid grid-cols-2 gap-2 mb-6'>
						{(['student', 'freelancer'] as const).map(r => (
							<button
								key={r}
								type='button'
								onClick={() => setRole(r)}
								className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
									role === r
										? 'bg-primary text-primary-foreground border-primary'
										: 'border-border text-muted-foreground hover:border-primary/50'
								}`}
							>
								{r === 'student' ? 'Заказчик' : 'Исполнитель'}
							</button>
						))}
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
						{/* Nickname */}
						<div>
							<label className='block text-sm font-medium text-foreground mb-1.5'>
								Никнейм
							</label>
							<div className='relative'>
								<User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<input
									{...register('name')}
									placeholder='ivan_ivanov'
									className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								/>
							</div>
							{errors.name && (
								<p className='text-destructive text-xs mt-1'>
									{errors.name.message}
								</p>
							)}
						</div>

						{/* Email */}
						<div>
							<label className='block text-sm font-medium text-foreground mb-1.5'>
								Email
							</label>
							<div className='relative'>
								<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<input
									{...register('email')}
									type='email'
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

						{/* Password */}
						<div>
							<label className='block text-sm font-medium text-foreground mb-1.5'>
								Пароль
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<input
									{...register('password')}
									type='password'
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

						{/* Confirm */}
						<div>
							<label className='block text-sm font-medium text-foreground mb-1.5'>
								Повторите пароль
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<input
									{...register('confirmPassword')}
									type='password'
									placeholder='••••••••'
									className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition'
								/>
							</div>
							{errors.confirmPassword && (
								<p className='text-destructive text-xs mt-1'>
									{errors.confirmPassword.message}
								</p>
							)}
						</div>

						<button
							type='submit'
							disabled={isSubmitting}
							className='w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors mt-2'
						>
							{isSubmitting ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
						</button>
					</form>
				</motion.div>
			</div>
		</div>
	)
}
