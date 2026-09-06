import { extname } from 'path'

/**
 * Whitelist вложений чата. Проверяем и расширение, и MIME-тип: расширение
 * решает, чем файл откроется у получателя (главное — не пустить .html/.svg,
 * исполняемое инлайн-содержимое), а MIME отсекает явное несоответствие.
 *
 * MIME приходит от клиента и подделываем, поэтому это не гарантия типа, а
 * барьер против самого дешёвого злоупотребления — загрузки произвольного
 * активного контента. Тип по содержимому (magic bytes) — отдельная задача.
 */

const ALLOWED_EXTENSIONS = new Set([
	// изображения
	'.jpg',
	'.jpeg',
	'.png',
	'.webp',
	'.gif',
	// документы
	'.pdf',
	'.doc',
	'.docx',
	'.xls',
	'.xlsx',
	'.ppt',
	'.pptx',
	'.txt',
	'.rtf',
	'.csv',
	// архивы
	'.zip',
	'.rar',
	'.7z',
])

const ALLOWED_MIME_PREFIXES = ['image/']

const ALLOWED_MIME_TYPES = new Set([
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'text/plain',
	'application/rtf',
	'text/rtf',
	'text/csv',
	'application/zip',
	'application/x-zip-compressed',
	'application/vnd.rar',
	'application/x-rar-compressed',
	'application/x-7z-compressed',
	// многие браузеры отдают офисные файлы и архивы как generic binary —
	// расширение при этом уже проверено, так что это безопасно допустить
	'application/octet-stream',
])

export function isAllowedChatAttachment(
	originalname: string,
	mimetype: string,
): boolean {
	const ext = extname(originalname).toLowerCase()
	if (!ALLOWED_EXTENSIONS.has(ext)) return false

	if (ALLOWED_MIME_PREFIXES.some(prefix => mimetype.startsWith(prefix))) {
		return true
	}
	return ALLOWED_MIME_TYPES.has(mimetype)
}
