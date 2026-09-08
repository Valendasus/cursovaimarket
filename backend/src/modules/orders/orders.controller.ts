import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { Roles } from '@/common/decorators/roles.decorator'
import { EmailVerifiedGuard } from '@/common/guards/email-verified.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
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
import { UserRole } from '@prisma/client'
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto'
import { OrdersService } from './orders.service'

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@Post()
	@UseGuards(RolesGuard, EmailVerifiedGuard)
	@Roles(UserRole.STUDENT)
	@ApiOperation({ summary: 'Создать заказ (только студент, email подтверждён)' })
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

	@Post(':id/confirm')
	@UseGuards(EmailVerifiedGuard)
	@ApiOperation({
		summary: 'Подтвердить заказ (исполнитель). Депонирует средства в эскроу',
	})
	confirm(@Param('id') id: string, @CurrentUser('id') userId: string) {
		return this.ordersService.confirm(id, userId)
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
