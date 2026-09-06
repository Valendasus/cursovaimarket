import { resendVerificationApi } from '@/api/auth'
import { extractApiError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { MailWarning } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

/**
 * Shown to authenticated users whose email is not yet verified.
 * Legacy accounts are backfilled to verified, so they never see this.
 */
export default function EmailVerificationBanner() {
	const user = useAuthStore(s => s.user)
	const [sending, setSending] = useState(false)

	// emailVerified === false means explicitly unverified; undefined → hide
	if (!user || user.emailVerified !== false) return null

	const handleResend = async () => {
		setSending(true)
		try {
			const res = await resendVerificationApi(user.email)
			toast.success(res.message ?? 'Письмо отправлено')
		} catch (err) {
			toast.error(extractApiError(err, 'Не удалось отправить письмо'))
		} finally {
			setSending(false)
		}
	}

	return (
		<div className='w-full bg-amber-50 border-b border-amber-200 text-amber-900'>
			<div className='mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-2.5 text-sm sm:flex-row sm:justify-center'>
				<span className='flex items-center gap-2 text-center'>
					<MailWarning className='h-4 w-4 shrink-0' />
					Подтвердите email <strong>{user.email}</strong>, чтобы создавать
					заказы, оставлять отзывы и писать в чат.
				</span>
				<button
					type='button'
					onClick={handleResend}
					disabled={sending}
					className='shrink-0 rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60'
				>
					{sending ? 'Отправляем…' : 'Отправить письмо повторно'}
				</button>
			</div>
		</div>
	)
}
