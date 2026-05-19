import type { Request } from 'express'
import { existsSync, mkdirSync } from 'fs'
import { isAbsolute, join } from 'path'

const DEFAULT_UPLOADS_DIR = 'uploads'
const DEFAULT_AVATAR_SUBDIR = 'avatars'

export function resolveUploadsRoot(): string {
	const uploadsDir = process.env.UPLOADS_DIR || DEFAULT_UPLOADS_DIR
	return isAbsolute(uploadsDir) ? uploadsDir : join(process.cwd(), uploadsDir)
}

export function resolveAvatarDir(): string {
	const subdir = process.env.AVATAR_SUBDIR || DEFAULT_AVATAR_SUBDIR
	const dir = join(resolveUploadsRoot(), subdir)
	ensureDir(dir)
	return dir
}

export function buildAvatarPath(filename: string): string {
	const subdir = process.env.AVATAR_SUBDIR || DEFAULT_AVATAR_SUBDIR
	return `/uploads/${subdir}/${filename}`
}

export function buildPublicUrl(pathname: string, req?: Request): string {
	const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
	const baseUrl = process.env.PUBLIC_URL
	if (baseUrl) {
		return `${baseUrl.replace(/\/$/, '')}${normalized}`
	}
	if (req) {
		const host = req.get('host') ?? 'localhost:3000'
		return `${req.protocol}://${host}${normalized}`
	}
	return normalized
}

function ensureDir(dir: string) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}
}
