import { PaymentsModule } from '@/modules/payments/payments.module'
import { Module } from '@nestjs/common'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { RefundRequestsController } from './refund-requests.controller'

@Module({
	imports: [PaymentsModule],
	controllers: [OrdersController, RefundRequestsController],
	providers: [OrdersService],
})
export class OrdersModule {}
