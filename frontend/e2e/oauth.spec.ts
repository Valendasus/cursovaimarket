import { expect, test } from '@playwright/test'
import { installApiMocks } from './fixtures'

test('ненастроенные провайдеры отключены, вход по паролю остаётся доступен', async ({
	page,
}) => {
	await installApiMocks(page, { user: null })
	await page.goto('/login')
	await expect(
		page.getByRole('button', { name: 'Войти через Google' }),
	).toBeDisabled()
	await expect(
		page.getByRole('button', { name: 'Войти через Яндекс' }),
	).toBeDisabled()
	await expect(
		page.getByRole('button', { name: 'Войти', exact: true }),
	).toBeEnabled()
	await expect(
		page.getByText('Недоступные способы входа пока не подключены.'),
	).toBeVisible()
})

for (const [provider, label] of [
	['google', 'Google'],
	['yandex', 'Яндекс'],
]) {
	test(`регистрация через ${label} передаёт роль и адрес возврата`, async ({
		page,
	}) => {
		await installApiMocks(page, { user: null })
		await page.route('**/api/v1/auth/oauth/providers', (route) =>
			route.fulfill({ json: { google: true, yandex: true } }),
		)
		let body: unknown
		await page.route(`**/api/v1/auth/oauth/${provider}/start`, (route) => {
			body = route.request().postDataJSON()
			return route.fulfill({
				json: { url: 'http://127.0.0.1:4173/auth/callback?error=cancelled' },
			})
		})
		await page.goto('/register?redirect=%2Fservices')
		await page.getByRole('button', { name: 'Исполнитель', exact: true }).click()
		await page.getByRole('button', { name: `Войти через ${label}` }).click()
		await expect(page.getByRole('alert')).toContainText('Вы отменили вход')
		expect(body).toEqual({ role: 'FREELANCER', redirect: '/services' })
	})
}

test('успешный callback использует сессию Bootstrap и сохраняет адрес возврата', async ({
	page,
}) => {
	await installApiMocks(page)
	let refreshes = 0
	page.on('request', (request) => {
		if (request.url().endsWith('/auth/refresh')) refreshes++
	})
	await page.goto(
		'/auth/callback?status=success&redirect=%2Fdashboard%3Ftab%3Dsettings',
	)
	await expect(page).toHaveURL(/\/dashboard\?tab=settings$/)
	await expect(
		page.getByRole('heading', { name: 'Способы входа' }),
	).toBeVisible()
	expect(refreshes).toBe(1)
})

test('настройки показывают привязанный аккаунт и позволяют привязать второй', async ({
	page,
}) => {
	await installApiMocks(page)
	await page.route('**/api/v1/auth/oauth/providers', (route) =>
		route.fulfill({ json: { google: true, yandex: true } }),
	)
	await page.route('**/api/v1/auth/oauth/accounts', (route) =>
		route.fulfill({ json: [{ provider: 'google' }] }),
	)
	await page.goto('/dashboard?tab=settings')
	await expect(
		page.getByRole('button', { name: 'Google подключён' }),
	).toBeDisabled()
	await expect(
		page.getByRole('button', { name: 'Привязать Яндекс' }),
	).toBeEnabled()
	await page.route('**/api/v1/auth/oauth/yandex/link', (route) =>
		route.fulfill({
			json: { url: 'http://127.0.0.1:4173/auth/callback?status=linked' },
		}),
	)
	await page.getByRole('button', { name: 'Привязать Яндекс' }).click()
	await expect(page).toHaveURL(/\/dashboard\?tab=settings$/)
})

test('конфликт почты объясняет безопасную привязку, токены в URL отсутствуют', async ({
	page,
}) => {
	await installApiMocks(page, { user: null })
	await page.goto('/auth/callback?error=account_exists&redirect=%2Fservices')
	await expect(page.getByRole('alert')).toContainText(
		'Войдите привычным способом',
	)
	await page.getByRole('link', { name: 'Вернуться ко входу' }).click()
	await expect(page).toHaveURL(/\/login\?redirect=%2Fservices/)
	expect(
		await page.evaluate(() => localStorage.getItem('accessToken')),
	).toBeNull()
})

test('поддельный success без сессии не авторизует пользователя', async ({
	page,
}) => {
	await installApiMocks(page, { user: null })
	await page.goto('/auth/callback?status=success&redirect=%2Fdashboard')
	await expect(page.getByRole('alert')).toContainText('Сессия не восстановлена')
})

test('мобильный вход не имеет горизонтального переполнения', async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await installApiMocks(page, { user: null })
	await page.goto('/login')
	await expect(
		page.getByRole('button', { name: 'Войти через Google' }),
	).toBeVisible()
	await expect(
		page.getByRole('button', { name: 'Войти через Яндекс' }),
	).toBeVisible()
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true)
})
