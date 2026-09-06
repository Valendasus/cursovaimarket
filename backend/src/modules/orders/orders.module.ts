import { PaymentsModule } from '@/modules/payments/payments.module'
import { Module } from '@nestjs/common'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
	imports: [PaymentsModule],
	controllers: [OrdersController],
	providers: [OrdersService],
})
export class OrdersModule {}
