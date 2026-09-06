import { useEffect, useRef, useState } from 'react'

/**
 * Разбирает строку вида «1 200+», «4.9», «98%» на число и то, что вокруг него,
 * чтобы досчитывать только цифры, а знаки оставить на месте.
 */
function parse(raw: string) {
	const match = raw.match(/^(\D*)([\d\s.,]+)(\D*)$/)
	if (!match) return null

	const [, prefix, digits, suffix] = match
	const normalized = digits.replace(/\s/g, '').replace(',', '.')
	const target = Number(normalized)
	if (!Number.isFinite(target)) return null

	const decimals = normalized.includes('.')
		? normalized.split('.')[1].length
		: 0
	// разделяем тысячи пробелом только если так было в исходной строке
	const grouped = /\d\s\d/.test(digits)

	return { prefix, suffix, target, decimals, grouped }
}

function format(value: number, decimals: number, grouped: boolean) {
	return value.toLocaleString('ru-RU', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		useGrouping: grouped,
	})
}

function prefersReducedMotion() {
	if (typeof window === 'undefined' || !window.matchMedia) return false
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Досчитывает число вверх, когда блок появляется на экране.
 *
 * Нераспознанную строку отдаёт как есть, а при включённом «уменьшить движение»
 * сразу показывает финальное значение — цифры важнее анимации.
 */
export function CountUp({
	value,
	active,
	duration = 1400,
}: {
	value: string
	/** Запускать отсчёт (обычно — попадание блока в зону видимости) */
	active: boolean
	duration?: number
}) {
	const parsed = parse(value)
	const [display, setDisplay] = useState(() =>
		parsed ? format(0, parsed.decimals, parsed.grouped) : value,
	)
	const frameRef = useRef<number | null>(null)

	useEffect(() => {
		if (!parsed || !active) return

		if (prefersReducedMotion()) {
			setDisplay(format(parsed.target, parsed.decimals, parsed.grouped))
			return
		}

		const start = performance.now()
		const tick = (now: number) => {
			const progress = Math.min((now - start) / duration, 1)
			// ease-out-cubic: быстро стартует, мягко тормозит у финального значения
			const eased = 1 - Math.pow(1 - progress, 3)
			setDisplay(
				format(parsed.target * eased, parsed.decimals, parsed.grouped),
			)
			if (progress < 1) frameRef.current = requestAnimationFrame(tick)
		}
		frameRef.current = requestAnimationFrame(tick)

		return () => {
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
		}
		// parsed пересоздаётся каждый рендер, поэтому в зависимостях — исходная строка
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, active, duration])

	if (!parsed) return <>{value}</>

	return (
		<>
			{parsed.prefix}
			{display}
			{parsed.suffix}
		</>
	)
}
