/// <reference types="jest" />
import {
	BadRequestException,
	ConflictException,
	NotFoundException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { UsersService } from './users.service'

type MockFn = jest.Mock<any, any>

type PrismaMock = {
	user: {
		findUnique: MockFn
		findMany: MockFn
		count: MockFn
		update: MockFn
	}
	freelancerProfile: {
		upsert: MockFn
	}
	service: {
		updateMany: MockFn
	}
	$transaction: MockFn
}

type S3ServiceMock = {
	signUrl: MockFn
}

function makePrisma(): PrismaMock {
	return {
		user: {
			findUnique: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			update: jest.fn(),
		},
		freelancerProfile: {
			upsert: jest.fn(),
		},
		service: {
			updateMany: jest.fn(),
		},
		$transaction: jest.fn(),
	}
}

function makeS3(): S3ServiceMock {
	return {
		signUrl: jest.fn().mockImplementation((avatar?: string) =>
			avatar ? `https://signed.cdn/${avatar}` : null,
		),
	}
}

function build(): [UsersService, PrismaMock, S3ServiceMock] {
	const prisma = makePrisma()
	const s3 = makeS3()
	const service = new UsersService(prisma as never, s3 as never)
	return [service, prisma, s3]
}

const userRecord = {
	id: 'user_123',
	email: 'private_student@example.com',
	password: 'hashed_password',
	name: 'Иван Студент',
	avatar: 'avatars/avatar.png',
	role: UserRole.STUDENT,
	emailVerified: true,
	emailVerifiedAt: new Date('2026-01-01'),
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	profile: null,
}

const freelancerRecord = {
	id: 'freelancer_456',
	name: 'Пётр Фрилансер',
	avatar: 'avatars/petr.png',
	role: UserRole.FREELANCER,
	createdAt: new Date('2026-01-01'),
	profile: {
		bio: 'Курсовые по физике',
		rating: 4.9,
		reviewsCount: 10,
		completedOrders: 15,
		specializations: ['physics'],
		isVerified: true,
	},
	services: [{ id: 'svc_1', rating: 4.9 }],
}

describe('UsersService', () => {
	describe('findMe (личный профиль)', () => {
		it('возвращает личные данные пользователя включая email и emailVerified', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue(userRecord)

			const result = await service.findMe('user_123')

			expect(result.id).toBe('user_123')
			expect(result.email).toBe('private_student@example.com')
			expect(result.emailVerified).toBe(true)
			expect((result as Record<string, unknown>).password).toBeUndefined()
			expect(result.avatar).toBe('https://signed.cdn/avatars/avatar.png')
		})

		it('выбрасывает NotFoundException если пользователь не найден', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue(null)

			await expect(service.findMe('missing_id')).rejects.toThrow(
				NotFoundException,
			)
		})
	})

	describe('findPublicById (публичный профиль)', () => {
		it('НЕ запрашивает и не возвращает email, emailVerifiedAt или password', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue({
				id: 'user_123',
				name: 'Иван Студент',
				avatar: 'avatars/avatar.png',
				role: UserRole.STUDENT,
				createdAt: new Date('2026-01-01'),
				profile: null,
			})

			const result = await service.findPublicById('user_123')

			expect(result.id).toBe('user_123')
			expect(result.name).toBe('Иван Студент')
			expect((result as Record<string, unknown>).email).toBeUndefined()
			expect((result as Record<string, unknown>).password).toBeUndefined()
			expect((result as Record<string, unknown>).emailVerifiedAt).toBeUndefined()

			const callArgs = prisma.user.findUnique.mock.calls[0][0]
			expect(callArgs.select).toBeDefined()
			expect(callArgs.select.email).toBeUndefined()
			expect(callArgs.select.password).toBeUndefined()
			expect(callArgs.select.emailVerifiedAt).toBeUndefined()
		})

		it('выбрасывает NotFoundException если пользователь не найден', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue(null)

			await expect(service.findPublicById('missing_id')).rejects.toThrow(
				NotFoundException,
			)
		})

		it('findById делегирует в findPublicById', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue({
				id: 'user_123',
				name: 'Иван Студент',
				avatar: null,
				role: UserRole.STUDENT,
				createdAt: new Date('2026-01-01'),
				profile: null,
			})

			const result = await service.findById('user_123')
			expect(result.id).toBe('user_123')
			expect((result as Record<string, unknown>).email).toBeUndefined()
		})
	})

	describe('findFreelancers (каталог исполнителей)', () => {
		it('НЕ запрашивает и не возвращает email фрилансеров', async () => {
			const [service, prisma] = build()
			prisma.user.findMany.mockResolvedValue([freelancerRecord])
			prisma.user.count.mockResolvedValue(1)

			const result = await service.findFreelancers(1, 10)

			expect(result.data).toHaveLength(1)
			expect(result.data[0].id).toBe('freelancer_456')
			expect(result.data[0].name).toBe('Пётр Фрилансер')
			expect((result.data[0] as Record<string, unknown>).email).toBeUndefined()
			expect((result.data[0] as Record<string, unknown>).password).toBeUndefined()

			const callArgs = prisma.user.findMany.mock.calls[0][0]
			expect(callArgs.select).toBeDefined()
			expect(callArgs.select.email).toBeUndefined()
			expect(callArgs.select.password).toBeUndefined()
		})

		it('применяет поиск по имени до пагинации и считает total с тем же фильтром', async () => {
			const [service, prisma] = build()
			prisma.user.findMany.mockResolvedValue([])
			prisma.user.count.mockResolvedValue(0)

			await service.findFreelancers(2, 10, 'Пётр')

			const expectedWhere = {
				role: UserRole.FREELANCER,
				name: { contains: 'Пётр', mode: 'insensitive' },
			}
			expect(prisma.user.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: expectedWhere, skip: 10, take: 10 }),
			)
			expect(prisma.user.count).toHaveBeenCalledWith({ where: expectedWhere })
		})
	})

	describe('updateMe', () => {
		it('обновляет профиль пользователя без пароля в ответе', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue(null) // ник свободен
			prisma.user.update.mockResolvedValue({
				...userRecord,
				name: 'Новое Имя',
			})

			const result = await service.updateMe('user_123', { name: 'Новое Имя' })

			expect(result.name).toBe('Новое Имя')
			expect((result as Record<string, unknown>).password).toBeUndefined()
			expect(prisma.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 'user_123' },
					data: { name: 'Новое Имя' },
				}),
			)
		})

		it('выбрасывает ConflictException если никнейм уже занят другим пользователем', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue({
				id: 'other_user',
				name: 'ЗанятыйНик',
			})

			await expect(
				service.updateMe('user_123', { name: 'ЗанятыйНик' }),
			).rejects.toThrow(ConflictException)
		})
	})

	describe('updateProfile', () => {
		it('сохраняет bio и telegram фрилансера через upsert', async () => {
			const [service, prisma] = build()
			const profileData = { bio: 'Опытный автор', telegram: '@author' }
			prisma.freelancerProfile.upsert.mockResolvedValue({
				id: 'prof_1',
				userId: 'user_123',
				...profileData,
			})

			const result = await service.updateProfile('user_123', profileData)

			expect(result.bio).toBe('Опытный автор')
			expect(prisma.freelancerProfile.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { userId: 'user_123' },
				}),
			)
		})
	})

	describe('updateAvatar', () => {
		it('обновляет ссылку на аватар пользователя', async () => {
			const [service, prisma] = build()
			prisma.user.update.mockResolvedValue({
				...userRecord,
				avatar: 'avatars/new.png',
			})

			const result = await service.updateAvatar('user_123', 'avatars/new.png')

			expect(result.avatar).toBe('https://signed.cdn/avatars/new.png')
			expect((result as Record<string, unknown>).password).toBeUndefined()
		})
	})

	describe('switchRole', () => {
		it('переключает роль со STUDENT на FREELANCER и создаёт профиль', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue({
				...userRecord,
				role: UserRole.STUDENT,
				profile: null,
			})
			const updatedUser = {
				...userRecord,
				role: UserRole.FREELANCER,
				profile: { bio: '' },
			}
			prisma.$transaction.mockResolvedValue([updatedUser, { count: 0 }])

			const result = await service.switchRole('user_123', {
				role: UserRole.FREELANCER,
			})

			expect(result.role).toBe(UserRole.FREELANCER)
			expect((result as Record<string, unknown>).password).toBeUndefined()
			expect(prisma.$transaction).toHaveBeenCalled()
			expect(prisma.service.updateMany).toHaveBeenCalledWith({
				where: { freelancerId: 'user_123', deletedAt: null },
				data: { isActive: true },
			})
		})

		it('запрещает переключаться на ту же самую роль', async () => {
			const [service, prisma] = build()
			prisma.user.findUnique.mockResolvedValue({
				...userRecord,
				role: UserRole.STUDENT,
			})

			await expect(
				service.switchRole('user_123', { role: UserRole.STUDENT }),
			).rejects.toThrow(BadRequestException)
		})

		it('запрещает переключаться на недопустимую роль (например, ADMIN)', async () => {
			const [service] = build()

			await expect(
				service.switchRole('user_123', { role: UserRole.ADMIN }),
			).rejects.toThrow(BadRequestException)
		})
	})
})
