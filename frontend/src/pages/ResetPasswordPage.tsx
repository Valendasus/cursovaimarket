import { resetPasswordApi } from '@/api/auth'
import { extractApiError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Link, useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircle2, KeyRound, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

export default function ResetPasswordPage() {
	const { token } = useSearch({ strict: false }) as { token?: string }
	const clearUser = useAuthStore(state => state.clearUser)
	const [password, setPassword] = useState('')
	const [confirmation, setConfirmation] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [success, setSuccess] = useState(false)
	const [error, setError] = useState(
		token ? '' : 'Ссылка некорректна: отсутствует токен.',
	)

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault()
		if (!token) return
		if (password.length < 8) {
			setError('Пароль должен содержать минимум 8 символов')
			return
		}
		if (password.length > 72) {
			setError('Пароль не должен превышать 72 символа')
			return
		}
		if (password !== confirmation) {
			setError('Пароли не совпадают')
			return
		}

		setSubmitting(true)
		setError('')
		try {
			await resetPasswordApi(token, password)
			clearUser()
			setSuccess(true)
		} catch (err: unknown) {
			setError(
				extractApiError(
					err,
					'Не удалось сменить пароль. Возможно, ссылка устарела.',
				),
			)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-background px-4 py-12'>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className='glass-card rounded-2xl p-8 w-full max-w-md'
			>
				{success ? (
					<div className='text-center'>
						<CheckCircle2 className='w-16 h-16 mx-auto mb-6 text-green-500' />
						<h1 className='text-2xl font-bold text-foreground mb-3'>
							Пароль изменён
						</h1>
						<p className='text-sm text-muted-foreground mb-7'>
							Все старые сессии завершены. Войдите с новым паролем.
						</p>
						<Link
							to='/login'
							className='inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90'
						>
							Войти
						</Link>
					</div>
				) : (
					<>
						<div className='text-center mb-7'>
							<div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4'>
								<KeyRound className='w-6 h-6 text-primary' />
							</div>
							<h1 className='text-2xl font-bold text-foreground'>
								Новый пароль
							</h1>
							<p className='text-sm text-muted-foreground mt-2'>
								Придумайте пароль длиной от 8 символов.
							</p>
						</div>

						<form onSubmit={onSubmit} className='space-y-5'>
							<div>
								<label
									htmlFor='new-password'
									className='block text-sm font-medium mb-1.5'
								>
									Новый пароль
								</label>
								<input
									id='new-password'
									type='password'
									autoComplete='new-password'
									value={password}
									onChange={event => setPassword(event.target.value)}
									disabled={!token || submitting}
									className='w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50'
								/>
							</div>
							<div>
								<label
									htmlFor='confirm-password'
									className='block text-sm font-medium mb-1.5'
								>
									Повторите пароль
								</label>
								<input
									id='confirm-password'
									type='password'
									autoComplete='new-password'
									value={confirmation}
									onChange={event => setConfirmation(event.target.value)}
									disabled={!token || submitting}
									className='w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50'
								/>
							</div>

							{error && (
								<p className='flex gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2'>
									<XCircle className='h-4 w-4 shrink-0 mt-0.5' />
									{error}
								</p>
							)}

							<button
								type='submit'
								disabled={!token || submitting}
								className='w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60'
							>
								{submitting ? 'Меняем...' : 'Сохранить новый пароль'}
							</button>
						</form>
					</>
				)}
			</motion.div>
		</div>
	)
}
