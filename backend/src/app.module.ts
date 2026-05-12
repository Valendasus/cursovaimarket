import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './modules/auth/auth.module'
import { ChatModule } from './modules/chat/chat.module'
import { OrdersModule } from './modules/orders/orders.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { ServicesModule } from './modules/services/services.module'
import { UsersModule } from './modules/users/users.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
	imports: [
		// Config — загружает .env глобально
		ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

		// Rate limiting — 100 req / 60s globally, overridden per-route
		ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

		// Core
		PrismaModule,

		// Feature modules
		AuthModule,
		UsersModule,
		ServicesModule,
		OrdersModule,
		ReviewsModule,
		ChatModule,
	],
	providers: [
		// Apply ThrottlerGuard globally (routes can override with @Throttle / @SkipThrottle)
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
	],
})
export class AppModule {}
