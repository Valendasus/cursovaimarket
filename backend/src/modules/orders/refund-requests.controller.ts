import { Roles } from '@/common/decorators/roles.decorator'
import { RolesGuard } from '@/common/guards/roles.guard'
import {
	Controller,
	Get,
	Param,
	ParseEnumPipe,
	Query,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { RefundRequestStatus, UserRole } from '@prisma/client'
import { OrdersService } from './orders.service'

@ApiTags('Refund requests')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('refund-requests')
export class RefundRequestsController {
	constructor(private readonly ordersService: OrdersService) {}

	@Get()
	@ApiOperation({ summary: 'Очередь запросов на возврат для будущей админки' })
	findAll(
		@Query(
			'status',
			new ParseEnumPipe(RefundRequestStatus, { optional: true }),
		)
		status?: RefundRequestStatus,
	) {
		return this.ordersService.findRefundRequestsForAdmin(status)
	}

	@Get(':id')
	@ApiOperation({
		summary: 'Полный контекст запроса на возврат для администратора',
	})
	findOne(@Param('id') id: string) {
		return this.ordersService.findRefundRequestForAdmin(id)
	}
}
