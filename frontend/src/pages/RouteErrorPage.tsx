import type { ErrorComponentProps } from '@tanstack/react-router'
import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

export default function RouteErrorPage({ reset }: ErrorComponentProps) {
	const router = useRouter()

	const retry = () => {
		reset()
		void router.invalidate()
	}

	return (
		<div className='flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-16'>
			<div className='w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10'>
				<div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
					<AlertTriangle className='h-8 w-8' />
				</div>
				<p className='mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-destructive'>
					Ошибка страницы
				</p>
				<h1 className='text-2xl font-bold text-foreground sm:text-3xl'>
					Не удалось открыть этот раздел
				</h1>
				<p className='mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground'>
					Возможно, соединение прервалось или страница временно недоступна.
					Повторите попытку — введённые в других разделах данные не пострадают.
				</p>
				<div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
					<button
						type='button'
						onClick={retry}
						className='inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
					>
						<RotateCcw className='h-4 w-4' />
						Попробовать снова
					</button>
					<Link
						to='/'
						className='inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted'
					>
						<Home className='h-4 w-4' />
						На главную
					</Link>
				</div>
				<p className='mt-6 text-xs text-muted-foreground'>
					Если ошибка повторяется, напишите в{' '}
					<Link to='/support' className='text-primary hover:underline'>
						поддержку
					</Link>
					.
				</p>
			</div>
		</div>
	)
}
