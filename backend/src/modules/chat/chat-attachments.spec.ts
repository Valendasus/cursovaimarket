import { isAllowedChatAttachment } from './chat-attachments'

describe('isAllowedChatAttachment', () => {
	it('пропускает изображения', () => {
		expect(isAllowedChatAttachment('photo.jpg', 'image/jpeg')).toBe(true)
		expect(isAllowedChatAttachment('pic.PNG', 'image/png')).toBe(true)
	})

	it('пропускает документы и архивы', () => {
		expect(isAllowedChatAttachment('work.pdf', 'application/pdf')).toBe(true)
		expect(
			isAllowedChatAttachment(
				'report.docx',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			),
		).toBe(true)
		expect(isAllowedChatAttachment('archive.zip', 'application/zip')).toBe(true)
	})

	it('пропускает офисный файл, отданный браузером как octet-stream', () => {
		expect(
			isAllowedChatAttachment('sheet.xlsx', 'application/octet-stream'),
		).toBe(true)
	})

	it('блокирует активный контент даже с картиночным MIME', () => {
		// главный вектор: расширение решает, чем файл откроется
		expect(isAllowedChatAttachment('evil.html', 'image/png')).toBe(false)
		expect(isAllowedChatAttachment('evil.svg', 'image/svg+xml')).toBe(false)
		expect(isAllowedChatAttachment('run.exe', 'application/octet-stream')).toBe(
			false,
		)
		expect(isAllowedChatAttachment('shell.sh', 'text/plain')).toBe(false)
	})

	it('блокирует разрешённое расширение с несовместимым MIME', () => {
		expect(isAllowedChatAttachment('note.txt', 'text/html')).toBe(false)
	})

	it('блокирует файл без расширения', () => {
		expect(isAllowedChatAttachment('noext', 'application/pdf')).toBe(false)
	})
})
