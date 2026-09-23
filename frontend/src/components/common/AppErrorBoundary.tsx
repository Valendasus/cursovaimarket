import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false }

	static getDerivedStateFromError(): State {
		return { hasError: true }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		if (import.meta.env.DEV) {
			console.error('Application render error', error, info)
		}
	}

	render() {
		if (!this.state.hasError) return this.props.children

		return (
			<main className='flex min-h-screen items-center justify-center bg-background px-4 py-12'>
				<div className='w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10'>
					<div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
						<AlertTriangle className='h-8 w-8' />
					</div>
					<h1 className='text-2xl font-bold text-foreground'>
						Приложение не смогло загрузиться
					</h1>
					<p className='mt-3 text-base leading-relaxed text-muted-foreground'>
						Обновите страницу. Если проблема повторится, обратитесь в поддержку и
						укажите, после какого действия появилась ошибка.
					</p>
					<div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
						<button
							type='button'
							onClick={() => window.location.reload()}
							className='inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90'
						>
							<RefreshCw className='h-4 w-4' />
							Обновить страницу
						</button>
						<a
							href='/'
							className='inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted'
						>
							<Home className='h-4 w-4' />
							На главную
						</a>
					</div>
					<a href='mailto:support@cursovaimarket.ru' className='mt-6 inline-block text-sm text-primary hover:underline'>
						support@cursovaimarket.ru
					</a>
				</div>
			</main>
		)
	}
}
