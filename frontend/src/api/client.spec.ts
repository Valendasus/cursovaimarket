import { describe, expect, it } from 'vitest'
import { extractApiError } from './client'

describe('extractApiError', () => {
	it('returns a backend string message', () => {
		expect(
			extractApiError({ response: { data: { message: 'Нет доступа' } } }),
		).toBe('Нет доступа')
	})

	it('joins validation errors and falls back for unknown errors', () => {
		expect(
			extractApiError({ response: { data: { message: ['A', '', 'B'] } } }),
		).toBe('A, B')
		expect(extractApiError(new Error('network'), 'Ошибка сети')).toBe(
			'Ошибка сети',
		)
	})
})
