import PageLoader from '@/components/common/PageLoader'
import { safeAuthRedirect } from '@/lib/authRedirect'
import { useAuthStore } from '@/store/authStore'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'

const messages: Record<string, string> = {
	cancelled:
		'Вы отменили вход. Можно попробовать снова или войти по почте и паролю.',
	invalid_state:
		'Попытка входа устарела или открыта в другом браузере. Начните вход заново.',
	account_exists:
		'Аккаунт с этой почтой уже существует. Войдите привычным способом и привяжите Google или Яндекс в настройках профиля.',
	account_linked:
		'Этот аккаунт уже привязан, либо у вашего профиля есть другая привязка к этому провайдеру.',
	email_required:
		'Провайдер не передал подтверждённую почту Google или контактную почту Яндекса. Разрешите доступ к адресу или используйте регистрацию по почте.',
	provider_error:
		'Не удалось завершить вход через провайдера. Попробуйте ещё раз немного позже.',
}

export default function OAuthCallbackPage() {
	const search = useSearch({ strict: false }) as {
		status?: string
		error?: string
		redirect?: string
		mode?: string
	}
	const authenticated = useAuthStore((s) => s.isAuthenticated)
	const navigate = useNavigate()
	const success =
		!search.error &&
		authenticated &&
		(search.status === 'success' || search.status === 'linked')
	const target =
		search.status === 'linked'
			? '/dashboard?tab=settings'
			: safeAuthRedirect(search.redirect)
	// Bootstrap has already restored the httpOnly-cookie session. Do not rotate it twice.
	useEffect(() => {
		if (success)
			void navigate({
				to: target.startsWith('/auth/callback') ? '/' : target,
				replace: true,
			})
	}, [success, target, navigate])
	if (success) return <PageLoader />
	return (
		<div className="flex min-h-[65vh] items-center justify-center px-4 py-12">
			<div className="glass-card w-full max-w-md rounded-2xl p-8 text-center">
				<h1 className="text-2xl font-bold">
					Не удалось завершить {search.mode === 'link' ? 'привязку' : 'вход'}
				</h1>
				<p
					role="alert"
					className="mt-4 text-sm leading-relaxed text-muted-foreground"
				>
					{search.error
						? (messages[search.error] ?? messages.provider_error)
						: 'Сессия не восстановлена. Проверьте, разрешены ли cookie, и повторите вход.'}
				</p>
				<Link
					to={search.mode === 'link' && authenticated ? '/dashboard' : '/login'}
					search={
						search.mode === 'link' && authenticated
							? { tab: 'settings' }
							: { redirect: safeAuthRedirect(search.redirect) }
					}
					className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
				>
					{search.mode === 'link' && authenticated
						? 'В настройки'
						: 'Вернуться ко входу'}
				</Link>
			</div>
		</div>
	)
}
