import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(price)
}

export function formatDate(date: string | Date): string {
	return new Intl.DateTimeFormat('ru-RU', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
	const now = new Date()
	const target = new Date(date)
	const diffMs = now.getTime() - target.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return 'Сегодня'
	if (diffDays === 1) return 'Вчера'
	if (diffDays < 7) return `${diffDays} дн. назад`
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`
	return formatDate(date)
}

export function truncate(str: string, length: number): string {
	if (str.length <= length) return str
	return str.slice(0, length) + '...'
}

export function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/[а-яё]/g, char => {
			const map: Record<string, string> = {
				а: 'a',
				б: 'b',
				в: 'v',
				г: 'g',
				д: 'd',
				е: 'e',
				ё: 'yo',
				ж: 'zh',
				з: 'z',
				и: 'i',
				й: 'j',
				к: 'k',
				л: 'l',
				м: 'm',
				н: 'n',
				о: 'o',
				п: 'p',
				р: 'r',
				с: 's',
				т: 't',
				у: 'u',
				ф: 'f',
				х: 'h',
				ц: 'ts',
				ч: 'ch',
				ш: 'sh',
				щ: 'sch',
				ъ: '',
				ы: 'y',
				ь: '',
				э: 'e',
				ю: 'yu',
				я: 'ya',
			}
			return map[char] || char
		})
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
}

export function getInitials(name: string): string {
	return name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}
