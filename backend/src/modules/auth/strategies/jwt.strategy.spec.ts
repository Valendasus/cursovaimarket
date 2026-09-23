import { UnauthorizedException } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'

describe('JwtStrategy', () => {
	it('fails fast without JWT_SECRET', () => {
		expect(
			() =>
				new JwtStrategy(
					{ get: jest.fn().mockReturnValue(undefined) } as never,
					{} as never,
				),
		).toThrow('JWT_SECRET is not set')
	})

	it('returns the current database user', async () => {
		const user = { id: 'u1', email: 'user@example.com' }
		const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } }
		const strategy = new JwtStrategy(
			{ get: jest.fn().mockReturnValue('secret') } as never,
			prisma as never,
		)

		await expect(
			strategy.validate({ sub: 'u1', email: user.email, role: 'STUDENT' }),
		).resolves.toEqual(user)
		expect(prisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 'u1' } }),
		)
	})

	it('rejects a token for a deleted user', async () => {
		const strategy = new JwtStrategy(
			{ get: jest.fn().mockReturnValue('secret') } as never,
			{ user: { findUnique: jest.fn().mockResolvedValue(null) } } as never,
		)

		await expect(
			strategy.validate({ sub: 'gone', email: 'x@example.com', role: 'STUDENT' }),
		).rejects.toBeInstanceOf(UnauthorizedException)
	})
})
