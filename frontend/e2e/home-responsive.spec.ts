import { expect, test } from '@playwright/test'
import { installApiMocks, service, freelancer } from './fixtures'

test.beforeEach(async ({ page }) => {
	// Keep layout and interaction checks independent of the external font CDN.
	await page.route('https://fonts.googleapis.com/**', route => route.abort())
	await page.route('https://fonts.gstatic.com/**', route => route.abort())
})

const sizes = [
	{ name: 'small-mobile', width: 320, height: 740 },
	{ name: 'mobile', width: 390, height: 844 },
	{ name: 'tablet-portrait', width: 768, height: 1024 },
	{ name: 'tablet-landscape', width: 1024, height: 768 },
	{ name: 'laptop', width: 1366, height: 768 },
	{ name: 'desktop', width: 1440, height: 900 },
	{ name: 'wide-desktop', width: 1920, height: 1080 },
]

// Representative populated responses exercise the cards as well as the static
// landing sections; no backend or database mutations are needed for visual QA.
const groups = ['MATHEMATICS', 'INFORMATICS'].map((category, group) => ({
	category,
	services: Array.from({ length: 3 }, (_, index) => ({
		...service,
		id: `home-service-${group}-${index}`,
		category,
		title: group
			? 'Разработка приложения и пояснительной записки'
			: 'Курсовая работа по математическому анализу',
		freelancer: {
			...freelancer,
			id: `home-author-${group}-${index}`,
			name: [
				'Александра Константинопольская',
				'Михаил Петров',
				'Анна Смирнова',
			][index],
		},
	})),
}))

for (const size of sizes) {
	test(`главная: адаптив ${size.name} ${size.width}×${size.height}`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize(size)
		await page.emulateMedia({ reducedMotion: 'reduce' })
		await installApiMocks(page, { user: null })
		await page.route('**/api/v1/services/popular*', route =>
			route.fulfill({ json: { data: groups } }),
		)
		const errors: string[] = []
		page.on('pageerror', error => errors.push(error.message))
		await page.goto('/')
		await expect(page.getByRole('heading', { level: 1 })).toContainText(
			'Ваша задача.',
		)
		await expect(page.locator('.home-services-grid > div')).toHaveCount(6)
		await expect(page.locator('.home-freelancers-grid > div')).toHaveCount(4)
		await page.screenshot({
			path: testInfo.outputPath(`${size.name}-hero.png`),
			animations: 'disabled',
		})

		// Inspect descendant boxes, not just scrollWidth: overflow:hidden can
		// otherwise hide a broken layout from an ordinary horizontal-scroll check.
		const overflow = await page.evaluate(() => {
			return [
				...document.querySelectorAll('header a, header button, .home-page *'),
			]
				.filter(element => {
					const box = element.getBoundingClientRect()
					return (
						box.width > 0 &&
						box.height > 0 &&
						(box.left < -1 || box.right > innerWidth + 1)
					)
				})
				.map(element => `${element.tagName}.${element.className}`)
		})
		expect(overflow).toEqual([])
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true)

		if (size.width < 1024) {
			await page.getByRole('button', { name: 'Меню', exact: true }).click()
			await expect(
				page.getByRole('button', { name: 'Меню', exact: true }),
			).toHaveAttribute('aria-expanded', 'true')
			await expect(
				page
					.locator('#mobile-navigation')
					.getByRole('link', { name: 'Исполнители', exact: true }),
			).toBeVisible()
			await page.getByRole('button', { name: 'Меню', exact: true }).click()
		}
		await page.getByRole('tab', { name: 'Я исполнитель', exact: true }).click()
		await expect(
			page
				.getByRole('tabpanel')
				.getByRole('heading', { name: 'Создайте профиль' }),
		).toBeVisible()
		await page
			.getByRole('tab', { name: 'Я исполнитель', exact: true })
			.press('ArrowLeft')
		await expect(
			page.getByRole('tab', { name: 'Я заказчик', exact: true }),
		).toHaveAttribute('aria-selected', 'true')
		await expect(
			page
				.getByRole('tabpanel')
				.getByRole('heading', { name: 'Найдите услугу' }),
		).toBeVisible()
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
		await page.screenshot({
			path: testInfo.outputPath(`${size.name}-full.png`),
			fullPage: true,
			animations: 'disabled',
		})
		if ([390, 768, 1440].includes(size.width)) {
			await page.locator('#how-it-works').screenshot({
				path: testInfo.outputPath(`${size.name}-steps-and-benefits.png`),
				animations: 'disabled',
			})
		}
		// Reduced motion must make all reveals immediately readable, including
		// sections that have not yet entered the viewport.
		await expect(page.locator('.home-feature').last()).toHaveCSS('opacity', '1')
		await expect(page.locator('.home-feature').last()).toHaveCSS('transform', 'none')
		expect(errors).toEqual([])
		await page
			.getByRole('link', { name: 'Найти исполнителя', exact: true })
			.click()
		await expect(page).toHaveURL(/\/services$/)
	})
}

test('главная: пустая подборка и ошибка с повторной загрузкой', async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await installApiMocks(page, { user: null })
	await page.goto('/')
	await expect(page.getByText('Популярные услуги скоро появятся')).toBeVisible()
	await page.route('**/api/v1/services/popular*', route =>
		route.fulfill({ status: 500, json: { message: 'Test error' } }),
	)
	await page.reload()
	await expect(
		page.getByText('Не удалось загрузить популярные услуги'),
	).toBeVisible({ timeout: 15000 })
	await page.route('**/api/v1/services/popular*', route =>
		route.fulfill({ json: { data: groups } }),
	)
	await page.getByRole('button', { name: 'Попробовать снова' }).first().click()
	await expect(page.locator('.home-services-grid > div')).toHaveCount(6)
})

test('направление с главной открывает фильтр каталога и сохраняется при возврате', async ({ page }) => {
	await installApiMocks(page, { user: null })
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.goto('/')
	const filteredRequest = page.waitForRequest(request => {
		const url = new URL(request.url())
		return url.pathname.endsWith('/v1/services') && url.searchParams.get('category') === 'MATHEMATICS'
	})
	await page.locator('.home-category').filter({ hasText: 'Математика' }).click()
	await filteredRequest
	await expect(page).toHaveURL(/\/services\?category=mathematics$/)
	await expect(page.getByRole('button', { name: 'Математика', exact: true })).toHaveAttribute('aria-pressed', 'true')
	await page.getByRole('button', { name: 'Все категории', exact: true }).click()
	await expect(page).toHaveURL(/\/services$/)
	await page.goBack()
	await expect(page.getByRole('button', { name: 'Математика', exact: true })).toHaveAttribute('aria-pressed', 'true')
	await page.reload()
	await expect(page.getByRole('button', { name: 'Математика', exact: true })).toHaveAttribute('aria-pressed', 'true')
	await page.goto('/services?category=unknown')
	await expect(page.getByRole('button', { name: 'Все категории', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('главная: загрузка и появление секций с обычной анимацией', async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 1366, height: 768 })
	await page.emulateMedia({ reducedMotion: 'no-preference' })
	await installApiMocks(page, { user: null })
	let release: () => void = () => {}
	const responseGate = new Promise<void>(resolve => {
		release = resolve
	})
	await page.route('**/api/v1/services/popular*', async route => {
		await responseGate
		await route.fulfill({ json: { data: groups } })
	})
	await page.goto('/')
	await expect(
		page.getByRole('status', { name: 'Загружаем популярные услуги' }),
	).toBeAttached()
	await expect(
		page.getByRole('status', { name: 'Загружаем исполнителей' }),
	).toBeAttached()
	release()
	await expect(page.locator('.home-services-grid > div')).toHaveCount(6)
	const categories = page.locator('.home-categories')
	await expect(page.locator('.home-step').first()).toHaveCSS('opacity', '0')
	await categories.scrollIntoViewIfNeeded()
	await expect(categories.locator('..')).toHaveCSS('opacity', '1')
	await expect(categories.getByRole('link')).toHaveCount(10)
	await expect(page.locator('.home-category-wrap').last()).toHaveCSS('opacity', '1')
	await categories.getByRole('link').first().hover()
	await expect(categories.locator('.home-category-icon').first()).not.toHaveCSS('transform', 'none')
	await page
		.getByRole('heading', { name: 'Как это работает', exact: true })
		.scrollIntoViewIfNeeded()
	await expect(page.getByRole('tabpanel')).toBeVisible()
	await page.locator('.home-step').last().scrollIntoViewIfNeeded()
	await expect(page.locator('.home-step').last()).toHaveCSS('opacity', '1')
	await page.locator('.home-benefits').scrollIntoViewIfNeeded()
	await expect(page.locator('.home-feature').last()).toHaveCSS('opacity', '1')
	await page.locator('.home-benefits').screenshot({
		path: testInfo.outputPath('animated-benefits.png'),
	})
	await categories.scrollIntoViewIfNeeded()
	await expect(page.locator('.home-step').first()).toHaveCSS('opacity', '1')
})
