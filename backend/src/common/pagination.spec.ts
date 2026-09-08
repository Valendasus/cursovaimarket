/// <reference types="jest" />
import { clampPagination } from './pagination'

const opts = { defaultLimit: 50, maxLimit: 100 }

describe('clampPagination', () => {
	it('пропускает нормальные значения', () => {
		expect(clampPagination(2, 30, opts)).toEqual({
			page: 2,
			limit: 30,
			skip: 30,
		})
	})

	it('обрезает limit по верхней границе (защита от DoS)', () => {
		expect(clampPagination(1, 99999999, opts).limit).toBe(100)
	})

	it('подставляет defaultLimit при мусоре и неположительных', () => {
		expect(clampPagination(1, 0, opts).limit).toBe(50)
		expect(clampPagination(1, -5, opts).limit).toBe(50)
		expect(clampPagination(1, 'abc', opts).limit).toBe(50)
		expect(clampPagination(1, undefined, opts).limit).toBe(50)
	})

	it('не даёт отрицательный skip: page < 1 → страница 1', () => {
		expect(clampPagination(0, 20, opts)).toMatchObject({ page: 1, skip: 0 })
		expect(clampPagination(-3, 20, opts)).toMatchObject({ page: 1, skip: 0 })
	})

	it('корректный skip для дальних страниц', () => {
		expect(clampPagination(5, 10, opts).skip).toBe(40)
	})

	it('дробные значения округляет вниз', () => {
		expect(clampPagination(2.9, 10.7, opts)).toMatchObject({
			page: 2,
			limit: 10,
		})
	})
})
