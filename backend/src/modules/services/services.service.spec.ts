/// <reference types="jest" />
import { ServicesService } from './services.service'

describe('ServicesService', () => {
	it('ищет по всему каталогу до пагинации и считает total с тем же фильтром', async () => {
		const prisma = {
			service: {
				findMany: jest.fn().mockResolvedValue([]),
				count: jest.fn().mockResolvedValue(0),
				findUnique: jest.fn(),
				update: jest.fn(),
			},
		}
		const s3 = { signUrl: jest.fn() }
		const service = new ServicesService(prisma as never, s3 as never)

		await service.findAll({ search: 'алгебра', page: 2, limit: 12 })

		const expectedWhere = {
			isActive: true,
			deletedAt: null,
			OR: [
				{ title: { contains: 'алгебра', mode: 'insensitive' } },
				{ description: { contains: 'алгебра', mode: 'insensitive' } },
				{ tags: { has: 'алгебра' } },
			],
		}
		expect(prisma.service.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expectedWhere, skip: 12, take: 12 }),
		)
		expect(prisma.service.count).toHaveBeenCalledWith({ where: expectedWhere })
	})

	it('помечает услугу удалённой, чтобы смена роли её не восстановила', async () => {
		const prisma = {
			service: {
				findUnique: jest.fn().mockResolvedValue({
					id: 'service_1',
					freelancerId: 'freelancer_1',
				}),
				update: jest.fn().mockResolvedValue({}),
			},
		}
		const service = new ServicesService(prisma as never, { signUrl: jest.fn() } as never)

		await service.remove('service_1', 'freelancer_1')

		expect(prisma.service.update).toHaveBeenCalledWith({
			where: { id: 'service_1' },
			data: { isActive: false, deletedAt: expect.any(Date) },
		})
	})
})
