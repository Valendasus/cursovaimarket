import { describe, expect, it } from 'vitest'
import { safeAuthRedirect } from './authRedirect'

describe('safeAuthRedirect', () => {
	it.each([
		'https://evil.example',
		'//evil.example',
		'/\\evil.example',
		'/%2f%2fevil.example',
		'/\t/evil.example',
		undefined,
	])('rejects %s', (value) => {
		expect(safeAuthRedirect(value)).toBe('/')
	})
	it('retains a local destination and its search', () => {
		expect(safeAuthRedirect('/dashboard?tab=settings')).toBe(
			'/dashboard?tab=settings',
		)
	})
})
