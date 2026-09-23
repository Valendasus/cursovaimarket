import { expect, test } from '@playwright/test'
import { freelancer, installApiMocks, service, student } from './fixtures'

test('создание услуги исполнителем', async ({ page }) => {
	const state = await installApiMocks(page, { user: freelancer, services: [] })
	await page.goto('/dashboard?tab=services')

	await page.getByRole('button', { name: 'Создать услугу' }).click()
	await page
		.getByPlaceholder('Написание курсовой по информатике')
		.fill('Решение задач по математике')
	await page
		.getByPlaceholder('Подробно опишите, что вы предлагаете...')
		.fill('Решаю и подробно оформляю задачи')
	await page.getByPlaceholder('3000').fill('3500')
	await page.getByPlaceholder('7').fill('5')
	await page.getByRole('button', { name: 'Создать услугу' }).click()

	await expect.poll(() => state.createdService?.title).toBe(
		'Решение задач по математике',
	)
})

test('поиск услуги отправляет фильтр и показывает результат', async ({ page }) => {
	await installApiMocks(page, { user: null, services: [service] })
	let searched = false
	page.on('request', request => {
		const url = new URL(request.url())
		if (url.pathname.endsWith('/services') && url.searchParams.get('search')) {
			searched = url.searchParams.get('search') === 'математика'
		}
	})

	await page.goto('/services')
	await page.getByPlaceholder('Поиск услуг...').fill('математика')
	await expect(page.getByText(service.title)).toBeVisible()
	await expect.poll(() => searched).toBe(true)
})

test('заказ выбранного пакета', async ({ page }) => {
	const state = await installApiMocks(page, { user: student })
	await page.goto(`/services/${service.id}`)

	await page.getByRole('button', { name: 'Заказать' }).click()
	await page
		.getByPlaceholder('Опишите тему, особые пожелания, дедлайн...')
		.fill('Нужна работа по интегралам')
	await page.getByRole('button', { name: 'Оформить заказ' }).click()

	await expect(page.getByText('Заказ размещён!')).toBeVisible()
	await expect.poll(() => state.createdOrder?.packageId).toBe('package-1')
})
