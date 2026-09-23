import { expect, test } from '@playwright/test'
import { installApiMocks } from './fixtures'

test('основная навигация доступна на мобильном экране', async ({ page }) => {
	await installApiMocks(page, { user: null })
	await page.goto('/services')

	await expect(page.getByRole('heading', { name: 'Все услуги' })).toBeVisible()
	await page.getByRole('button', { name: 'Меню' }).click()
	await expect(page.getByRole('link', { name: 'Услуги', exact: true })).toBeVisible()
	await expect(page.getByRole('link', { name: 'Исполнители' })).toBeVisible()
})
