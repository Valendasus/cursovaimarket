import { describe, expect, it } from 'vitest'
import { mapUser } from './auth'

describe('mapUser', () => {
	it('maps a student and normalizes the backend role', () => {
		const result = mapUser({
			id: 'u1',
			email: 'student@example.com',
			name: 'Student',
			role: 'STUDENT',
			emailVerified: true,
			createdAt: '2026-01-01T00:00:00.000Z',
		})

		expect(result).toMatchObject({
			id: 'u1',
			role: 'student',
			emailVerified: true,
		})
	})

	it('maps a freelancer profile and specialization values', () => {
		const result = mapUser({
			id: 'u2',
			email: 'freelancer@example.com',
			name: 'Freelancer',
			role: 'FREELANCER',
			createdAt: '2026-01-01T00:00:00.000Z',
			profile: {
				bio: 'Author',
				rating: 4.8,
				reviewsCount: 12,
				completedOrders: 20,
				specializations: ['MATHEMATICS', 'INFORMATICS'],
				isVerified: true,
				responseTime: '~1 час',
			},
		})

		expect(result).toMatchObject({
			role: 'freelancer',
			rating: 4.8,
			specializations: ['mathematics', 'informatics'],
			isVerified: true,
		})
	})
})
