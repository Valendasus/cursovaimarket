import { useEffect, useReducer } from 'react'

/** Человекочитаемый остаток до дедлайна; null — время вышло */
function formatLeft(deadline: string): string | null {
	const ms = new Date(deadline).getTime() - Date.now()
	if (ms <= 0) return null

	const totalMinutes = Math.floor(ms / 60_000)
	const hours = Math.floor(totalMinutes / 60)
	const minutes = totalMinutes % 60

	if (hours >= 1) return `${hours} ч ${minutes} мин`
	if (totalMinutes >= 1) return `${totalMinutes} мин`
	return 'меньше минуты'
}

/**
 * Обратный отсчёт до дедлайна подтверждения заказа.
 *
 * Остаток считается при рендере, а эффект только раз в минуту дёргает
 * ререндер — так не нужно держать производное значение в состоянии и
 * синхронизировать его при смене deadline. Секунды здесь не нужны, а лишние
 * ререндеры карточки заказа нужны ещё меньше.
 */
export function ConfirmCountdown({ deadline }: { deadline: string }) {
	const [, tick] = useReducer((n: number) => n + 1, 0)

	useEffect(() => {
		const timer = window.setInterval(tick, 60_000)
		return () => window.clearInterval(timer)
	}, [])

	const left = formatLeft(deadline)

	if (!left) {
		return <span className='text-destructive'>срок подтверждения истёк</span>
	}

	// Меньше часа — подсвечиваем, чтобы заказ не протух незаметно
	const urgent = !left.includes('ч')
	return (
		<span className={urgent ? 'text-orange-600 font-medium' : ''}>
			на подтверждение: {left}
		</span>
	)
}
