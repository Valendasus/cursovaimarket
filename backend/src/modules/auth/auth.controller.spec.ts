import { UnauthorizedException } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { AuthController } from './auth.controller'

describe('AuthController', () => {
	const originalNodeEnv = process.env.NODE_ENV
	const user = { id: 'u1', email: 'user@example.com' }

	function build() {
		const auth = {
			register: jest.fn().mockResolvedValue({
				user,
				accessToken: 'access',
				refreshToken: 'refresh',
			}),
			login: jest.fn().mockResolvedValue({
				user,
				accessToken: 'access',
				refreshToken: 'refresh',
			}),
			refresh: jest.fn().mockResolvedValue({
				user,
				accessToken: 'new-access',
				refreshToken: 'new-refresh',
			}),
			logout: jest.fn().mockResolvedValue({ message: 'Выход выполнен' }),
			getMe: jest.fn().mockResolvedValue(user),
			verifyEmail: jest
				.fn()
				.mockResolvedValue({ message: 'Email подтверждён' }),
			resendVerification: jest.fn().mockResolvedValue({ message: 'sent' }),
			requestPasswordChange: jest.fn().mockResolvedValue({ message: 'sent' }),
			resetPassword: jest.fn().mockResolvedValue({ message: 'changed' }),
		}
		const response = { cookie: jest.fn(), clearCookie: jest.fn() }
		return {
			controller: new AuthController(auth as never),
			auth,
			response,
		}
	}

	afterAll(() => {
		if (originalNodeEnv === undefined) delete process.env.NODE_ENV
		else process.env.NODE_ENV = originalNodeEnv
	})

	it('registers and sets a development refresh cookie', async () => {
		process.env.NODE_ENV = 'development'
		const { controller, auth, response } = build()
		const dto = {
			name: 'user',
			email: 'user@example.com',
			password: 'Password123!',
			role: UserRole.STUDENT,
		}

		await expect(controller.register(dto, response as never)).resolves.toEqual({
			user,
			accessToken: 'access',
		})
		expect(auth.register).toHaveBeenCalledWith(dto)
		expect(response.cookie).toHaveBeenCalledWith(
			'refresh_token',
			'refresh',
			expect.objectContaining({
				httpOnly: true,
				secure: false,
				sameSite: 'lax',
				path: '/',
			}),
		)
	})

	it('logs in with strict secure cookies in production', async () => {
		process.env.NODE_ENV = 'production'
		const { controller, response } = build()
		await controller.login(
			{ email: 'user@example.com', password: 'Password123!' },
			response as never,
		)
		expect(response.cookie).toHaveBeenCalledWith(
			'refresh_token',
			'refresh',
			expect.objectContaining({ secure: true, sameSite: 'strict' }),
		)
	})

	it('rotates a cookie and rejects refresh without one', async () => {
		const { controller, auth, response } = build()
		await expect(
			controller.refresh(
				{ cookies: { refresh_token: 'old-refresh' } } as never,
				response as never,
			),
		).resolves.toEqual({ user, accessToken: 'new-access' })
		expect(auth.refresh).toHaveBeenCalledWith('old-refresh')
		expect(response.cookie).toHaveBeenCalledWith(
			'refresh_token',
			'new-refresh',
			expect.any(Object),
		)

		await expect(
			controller.refresh({ cookies: {} } as never, response as never),
		).rejects.toBeInstanceOf(UnauthorizedException)
	})

	it('clears the cookie and revokes the current session on logout', async () => {
		const { controller, auth, response } = build()
		await controller.logout(
			{ cookies: { refresh_token: 'refresh' } } as never,
			response as never,
		)
		expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
			path: '/',
		})
		expect(auth.logout).toHaveBeenCalledWith('refresh')
	})

	it('delegates current-user and verification endpoints', async () => {
		const { controller, auth } = build()
		await expect(controller.getMe(user)).resolves.toEqual(user)
		await controller.verifyEmail({ token: 'token' })
		await controller.resendVerification({ email: user.email })
		expect(auth.getMe).toHaveBeenCalledWith(user)
		expect(auth.verifyEmail).toHaveBeenCalledWith('token')
		expect(auth.resendVerification).toHaveBeenCalledWith(user.email)
	})

	it('requests and completes password change, then clears the refresh cookie', async () => {
		const { controller, auth, response } = build()
		await expect(
			controller.requestPasswordChange({ id: 'u1' }),
		).resolves.toEqual({ message: 'sent' })
		expect(auth.requestPasswordChange).toHaveBeenCalledWith('u1')

		await expect(
			controller.resetPassword(
				{ token: 'reset-token', password: 'NewPassword123!' },
				response as never,
			),
		).resolves.toEqual({ message: 'changed' })
		expect(auth.resetPassword).toHaveBeenCalledWith(
			'reset-token',
			'NewPassword123!',
		)
		expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
			path: '/',
		})
	})
})
