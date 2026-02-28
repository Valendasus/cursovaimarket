import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto'
import { OrdersService } from './orders.service'

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@Post()
	@ApiOperation({ summary: 'Создать заказ' })
	create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
		return this.ordersService.create(userId, dto)
	}

	@Get()
	@ApiOperation({ summary: 'Мои заказы' })
	findMine(@CurrentUser() user: any) {
		return this.ordersService.findMyOrders(user.id, user.role)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Детали заказа' })
	findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
		return this.ordersService.findOne(id, userId)
	}

	@Patch(':id/status')
	@ApiOperation({ summary: 'Изменить статус заказа' })
	updateStatus(
		@Param('id') id: string,
		@CurrentUser('id') userId: string,
		@Body() dto: UpdateOrderStatusDto,
	) {
		return this.ordersService.updateStatus(id, userId, dto)
	}
}
