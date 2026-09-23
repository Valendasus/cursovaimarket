import { Link } from '@tanstack/react-router'
import { AlertCircle, Inbox, RotateCcw } from 'lucide-react'

type StatePanelProps = {
	variant?: 'error' | 'empty'
	title: string
	description?: string
	onRetry?: () => void
	retrying?: boolean
	link?: { label: string; to: '/' | '/services' | '/freelancers' | '/support' }
	compact?: boolean
}

export default function StatePanel({
	variant = 'error',
	title,
	description,
	onRetry,
	retrying = false,
	link,
	compact = false,
}: StatePanelProps) {
	const Icon = variant === 'error' ? AlertCircle : Inbox

	return (
		<div
			className={`flex flex-col items-center justify-center rounded-2xl border border-border bg-card/60 px-6 text-center ${
				compact ? 'py-8' : 'py-16'
			}`}
			role={variant === 'error' ? 'alert' : 'status'}
		>
			<div
				className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
					variant === 'error'
						? 'bg-destructive/10 text-destructive'
						: 'bg-muted text-muted-foreground'
				}`}
			>
				<Icon className='h-6 w-6' />
			</div>
			<h2 className='text-lg font-semibold text-foreground'>{title}</h2>
			{description && (
				<p className='mt-2 max-w-md text-sm leading-relaxed text-muted-foreground'>
					{description}
				</p>
			)}
			{(onRetry || link) && (
				<div className='mt-5 flex flex-wrap justify-center gap-3'>
					{onRetry && (
						<button
							type='button'
							onClick={onRetry}
							disabled={retrying}
							className='inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
						>
							<RotateCcw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
							{retrying ? 'Обновляем…' : 'Попробовать снова'}
						</button>
					)}
					{link && (
						<Link
							to={link.to}
							className='inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted'
						>
							{link.label}
						</Link>
					)}
				</div>
			)}
		</div>
	)
}
