import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './modules/auth/auth.module'
import { OrdersModule } from './modules/orders/orders.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { ServicesModule } from './modules/services/services.module'
import { UsersModule } from './modules/users/users.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
	imports: [
		// Config — загружает .env глобально
		ConfigModule.forRoot({ isGlobal: true }),

		// Rate limiting — 100 запросов за 60 сек
		ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

		// Core
		PrismaModule,

		// Feature modules
		AuthModule,
		UsersModule,
		ServicesModule,
		OrdersModule,
		ReviewsModule,
	],
})
export class AppModule {}
