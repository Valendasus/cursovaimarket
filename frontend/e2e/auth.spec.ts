import { expect, test } from '@playwright/test'
import { installApiMocks, student } from './fixtures'

test('регистрация нового пользователя', async ({ page }) => {
	await installApiMocks(page, { user: null })
	await page.goto('/register')

	await page.getByPlaceholder('ivan_ivanov').fill('new_student')
	await page.getByPlaceholder('you@example.com').fill('new@example.com')
	await page.locator('input[type="password"]').nth(0).fill('Password123!')
	await page.locator('input[type="password"]').nth(1).fill('Password123!')
	await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

	await expect(page).toHaveURL(/\/$/)
	await expect(page.getByText('new_student').first()).toBeVisible()
})

test('вход и восстановление сессии после перезагрузки', async ({ page }) => {
	let authenticated = false
	await page.route('**/api/v1/**', async route => {
		const path = new URL(route.request().url()).pathname
		if (path.endsWith('/auth/login')) {
			authenticated = true
			return route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({ user: student, accessToken: 'access-token' }),
			})
		}
		if (path.endsWith('/auth/refresh')) {
			return route.fulfill({
				status: authenticated ? 200 : 401,
				contentType: 'application/json',
				body: JSON.stringify(
					authenticated
						? { user: student, accessToken: 'refreshed-token' }
						: { message: 'Unauthorized' },
				),
			})
		}
		return route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ data: [], total: 0 }),
		})
	})

	await page.goto('/login')
	await page.getByPlaceholder('you@example.com').fill(student.email)
	await page.getByPlaceholder('••••••••').fill('Password123!')
	await page.getByRole('button', { name: 'Войти', exact: true }).click()
	await expect(
		page.getByRole('button', { name: /Тестовый/ }),
	).toBeVisible()

	await page.reload()
	await expect(
		page.getByRole('button', { name: /Тестовый/ }),
	).toBeVisible()
})
