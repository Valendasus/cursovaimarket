import type { ServiceCategory } from '@/types'

export interface CategoryTheme {
	/** Tailwind gradient classes */
	gradient: string
	/** Emoji icon */
	emoji: string
	/** Accent color class for text */
	accent: string
}

export const CATEGORY_THEME: Record<ServiceCategory, CategoryTheme> = {
	mathematics: {
		gradient: 'from-violet-500/20 via-purple-500/15 to-indigo-500/20',
		emoji: '📐',
		accent: 'text-violet-500',
	},
	economics: {
		gradient: 'from-emerald-500/20 via-teal-500/15 to-green-500/20',
		emoji: '📈',
		accent: 'text-emerald-500',
	},
	informatics: {
		gradient: 'from-blue-500/20 via-cyan-500/15 to-sky-500/20',
		emoji: '💻',
		accent: 'text-blue-500',
	},
	law: {
		gradient: 'from-amber-500/20 via-yellow-500/15 to-orange-500/20',
		emoji: '⚖️',
		accent: 'text-amber-500',
	},
	history: {
		gradient: 'from-orange-500/20 via-amber-500/15 to-red-500/20',
		emoji: '🏛️',
		accent: 'text-orange-500',
	},
	psychology: {
		gradient: 'from-pink-500/20 via-rose-500/15 to-purple-500/20',
		emoji: '🧠',
		accent: 'text-pink-500',
	},
	physics: {
		gradient: 'from-cyan-500/20 via-blue-500/15 to-indigo-500/20',
		emoji: '⚛️',
		accent: 'text-cyan-500',
	},
	chemistry: {
		gradient: 'from-lime-500/20 via-green-500/15 to-teal-500/20',
		emoji: '🧪',
		accent: 'text-lime-600',
	},
	biology: {
		gradient: 'from-green-500/20 via-emerald-500/15 to-teal-500/20',
		emoji: '🌿',
		accent: 'text-green-500',
	},
	engineering: {
		gradient: 'from-slate-500/20 via-gray-500/15 to-zinc-500/20',
		emoji: '⚙️',
		accent: 'text-slate-500',
	},
	management: {
		gradient: 'from-indigo-500/20 via-blue-500/15 to-violet-500/20',
		emoji: '📊',
		accent: 'text-indigo-500',
	},
	other: {
		gradient: 'from-fuchsia-500/20 via-purple-500/15 to-pink-500/20',
		emoji: '📚',
		accent: 'text-fuchsia-500',
	},
}
