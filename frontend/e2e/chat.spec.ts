import { expect, test } from '@playwright/test'
import { freelancer, installApiMocks, student } from './fixtures'

test('чат отправляет сообщение через HTTP fallback', async ({ page }) => {
	const state = await installApiMocks(page, { user: student })
	await page.goto('/dashboard?tab=messages')
	await page.getByRole('button', { name: new RegExp(freelancer.name) }).click()

	const input = page.getByPlaceholder('Напишите сообщение...')
	await input.fill('Здравствуйте!')
	await input.press('Enter')

	await expect(page.getByText('Здравствуйте!')).toBeVisible()
	await expect.poll(() => state.sentMessage?.content, { timeout: 5_000 }).toBe(
		'Здравствуйте!',
	)
})

test('загрузка файла в чат', async ({ page }) => {
	const state = await installApiMocks(page, { user: student })
	await page.goto('/dashboard?tab=messages')
	await page.getByRole('button', { name: new RegExp(freelancer.name) }).click()

	await page.locator('input[type="file"]').setInputFiles({
		name: 'test.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from('test content'),
	})
	await expect(page.getByText('test.txt')).toBeVisible()
	await page.getByPlaceholder('Напишите сообщение...').press('Enter')

	await expect.poll(() => state.uploadedFile).toBe(true)
	await expect.poll(() => state.sentMessage?.attachmentName).toBe('test.txt')
})
