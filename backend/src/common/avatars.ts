import { buildPublicUrl } from './uploads'

export function pickDefaultAvatar(): string | undefined {
	const list = parseAvatarList(process.env.DEFAULT_AVATARS)
	if (!list.length) return undefined
	const choice = list[Math.floor(Math.random() * list.length)]
	if (/^https?:\/\//i.test(choice)) {
		return choice
	}
	return buildPublicUrl(choice)
}

function parseAvatarList(raw?: string): string[] {
	if (!raw) return []
	return raw
		.split(',')
		.map(value => value.trim())
		.filter(Boolean)
}
