import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PaymentsService } from './payments.service'

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payments')
export class PaymentsController {
	constructor(private readonly payments: PaymentsService) {}

	/**
	 * Фронт по этим полям решает, показывать форму оплаты или плашку
	 * «тестовый режим», и какую комиссию написать исполнителю.
	 */
	@Get('config')
	@ApiOperation({ summary: 'Режим оплаты и ставка комиссии' })
	getConfig() {
		return {
			isLive: this.payments.isProviderLive(),
			feePercent: this.payments.feePercent,
		}
	}
}
