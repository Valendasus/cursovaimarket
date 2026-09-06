import { Module } from '@nestjs/common'
import { MockPaymentProvider } from './mock-payment.provider'
import { PaymentProvider } from './payment-provider.interface'
import { PaymentsService } from './payments.service'

/**
 * Подключение реального провайдера — это заменить MockPaymentProvider
 * на YooKassaProvider в одной строке ниже. Остальной код не меняется.
 */
@Module({
	providers: [
		PaymentsService,
		{ provide: PaymentProvider, useClass: MockPaymentProvider },
	],
	exports: [PaymentsService],
})
export class PaymentsModule {}
