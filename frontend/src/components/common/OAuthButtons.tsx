import { extractApiError } from '@/api/client'
import {
	getOAuthAccounts,
	getOAuthProviders,
	startOAuth,
	type OAuthProvider,
} from '@/api/oauth'
import { safeAuthRedirect } from '@/lib/authRedirect'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
	if (provider === 'yandex')
		return (
			<span
				aria-hidden="true"
				className="inline-flex size-5 items-center justify-center rounded-full bg-[#fc3f1d] text-sm font-semibold text-white"
			>
				Я
			</span>
		)
	return (
		<svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
			<path
				fill="#4285F4"
				d="M43.6 24.5c0-1.5-.1-3-.4-4.5H24v8.5h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.4Z"
			/>
			<path
				fill="#34A853"
				d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.4A20 20 0 0 0 24 44Z"
			/>
			<path
				fill="#FBBC05"
				d="M12.6 27.4a12 12 0 0 1 0-7.6v-5.4H5.7a20 20 0 0 0 0 18l6.9-5Z"
			/>
			<path
				fill="#EA4335"
				d="M24 12.2c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.7 15l6.9 5.4C14.2 15.6 18.7 12.2 24 12.2Z"
			/>
		</svg>
	)
}

export default function OAuthButtons({
	role = 'STUDENT',
	redirect,
	link = false,
}: {
	role?: 'STUDENT' | 'FREELANCER'
	redirect?: string
	link?: boolean
}) {
	const userId = useAuthStore((s) => s.user?.id)
	const providers = useQuery({
		queryKey: ['oauth-providers'],
		queryFn: getOAuthProviders,
		staleTime: 60_000,
		retry: 1,
	})
	const accounts = useQuery({
		queryKey: ['oauth-accounts', userId],
		queryFn: getOAuthAccounts,
		enabled: link && !!userId,
		retry: 1,
	})
	const [pending, setPending] = useState<OAuthProvider | null>(null)
	const [error, setError] = useState('')
	const begin = async (provider: OAuthProvider) => {
		setPending(provider)
		setError('')
		try {
			await startOAuth(provider, {
				role,
				redirect: safeAuthRedirect(redirect),
				link,
			})
		} catch (err) {
			setError(
				extractApiError(err, 'Не удалось начать вход. Попробуйте ещё раз.'),
			)
			setPending(null)
		}
	}
	return (
		<div className={link ? 'space-y-3' : 'mb-6 space-y-3'}>
			<div className={link ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'grid grid-cols-1 gap-3'}>
				{(['google', 'yandex'] as const).map((provider) => {
					const connected =
						link &&
						accounts.data?.some((account) => account.provider === provider)
					const enabled = providers.data?.[provider] === true
					const label = provider === 'google' ? 'Google' : 'Яндекс'
					return (
						<button
							key={provider}
							type="button"
							onClick={() => void begin(provider)}
							disabled={
								!enabled ||
								!!pending ||
								connected ||
								(link && (accounts.isPending || accounts.isError))
							}
							title={!enabled ? 'Провайдер пока не подключён' : undefined}
							className="flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
						>
							{pending === provider ? (
								<Loader2 aria-hidden="true" className="size-5 animate-spin" />
							) : connected ? (
								<Check aria-hidden="true" className="size-5 text-emerald-600" />
							) : (
								<ProviderIcon provider={provider} />
							)}
							{connected
								? `${label} подключён`
								: link
									? `Привязать ${label}`
									: `Войти через ${label}`}
						</button>
					)
				})}
			</div>
			{error && (
				<p
					role="alert"
					className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{error}
				</p>
			)}
			{providers.isError || (link && accounts.isError) ? (
				<p role="status" className="text-xs text-muted-foreground">
					Не удалось загрузить способы входа. Обновите страницу.
				</p>
			) : (
				providers.data &&
				(!providers.data.google || !providers.data.yandex) && (
					<p className="text-center text-xs text-muted-foreground">
						Недоступные способы входа пока не подключены.
					</p>
				)
			)}
			{!link && (
				<div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
					<span className="h-px flex-1 bg-border" />
					или по электронной почте
					<span className="h-px flex-1 bg-border" />
				</div>
			)}
		</div>
	)
}
