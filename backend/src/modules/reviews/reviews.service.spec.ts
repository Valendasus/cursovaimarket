/// <reference types="jest" />
import { ForbiddenException } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { ReviewsService } from './reviews.service'

describe('ReviewsService role boundary', () => {
	it('не разрешает бывшему заказчику оставить отзыв после смены роли', async () => {
		const service = new ReviewsService({} as never, {} as never)

		await expect(
			service.create('user_1', UserRole.FREELANCER, {
				orderId: 'order_1',
				rating: 5,
			}),
		).rejects.toThrow(ForbiddenException)
	})
})
