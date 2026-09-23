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
import {
	CreateDeadlineExtensionDto,
	CreateOrderDto,
	CreateRefundRequestDto,
	ResolveDeadlineExtensionDto,
	UpdateOrderStatusDto,
} from './dto/order.dto'
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
	@ApiOperation({
		summary: 'Создать заказ (только студент, email подтверждён)',
	})
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
	@UseGuards(RolesGuard, EmailVerifiedGuard)
	@Roles(UserRole.FREELANCER)
	@ApiOperation({
		summary: 'Подтвердить заказ (исполнитель): PENDING → ожидает оплаты',
	})
	confirm(@Param('id') id: string, @CurrentUser() user: any) {
		return this.ordersService.confirm(id, user.id, user.role)
	}

	@Post(':id/pay')
	@UseGuards(RolesGuard, EmailVerifiedGuard)
	@Roles(UserRole.STUDENT)
	@ApiOperation({
		summary: 'Оплатить заказ (заказчик): списание → заказ в работе',
	})
	pay(@Param('id') id: string, @CurrentUser() user: any) {
		return this.ordersService.pay(id, user.id, user.role)
	}

	@Patch(':id/status')
	@UseGuards(RolesGuard, EmailVerifiedGuard)
	@Roles(UserRole.STUDENT, UserRole.FREELANCER)
	@ApiOperation({ summary: 'Изменить статус заказа' })
	updateStatus(
		@Param('id') id: string,
		@CurrentUser() user: any,
		@Body() dto: UpdateOrderStatusDto,
	) {
		return this.ordersService.updateStatus(id, user.id, user.role, dto)
	}

	@Post(':id/deadline-extensions')
	@UseGuards(RolesGuard, EmailVerifiedGuard)
	@Roles(UserRole.FREELANCER)
	@ApiOperation({ summary: 'Запросить продление просроченного заказа' })
	requestDeadlineExtension(
		@Param('id') id: string,
		@CurrentUser() user: any,
		@Body() dto: CreateDeadlineExtensionDto,
	) {
		return this.ordersService.requestDeadlineExtension(
			id,
			user.id,
			user.role,
			dto,
		)
	}

	@Patch(':id/deadline-extensions/:requestId')
	@UseGuards(RolesGuard, EmailVerifiedGuard)
	@Roles(UserRole.STUDENT)
	@ApiOperation({ summary: 'Разрешить или отклонить продление заказа' })
	resolveDeadlineExtension(
		@Param('id') id: string,
		@Param('requestId') requestId: string,
		@CurrentUser() user: any,
		@Body() dto: ResolveDeadlineExtensionDto,
	) {
		return this.ordersService.resolveDeadlineExtension(
			id,
			requestId,
			user.id,
			user.role,
			dto,
		)
	}

	@Post(':id/refund-requests')
	@UseGuards(RolesGuard, EmailVerifiedGuard)
	@Roles(UserRole.STUDENT)
	@ApiOperation({
		summary: 'Создать запрос на возврат средств для администратора',
	})
	createRefundRequest(
		@Param('id') id: string,
		@CurrentUser() user: any,
		@Body() dto: CreateRefundRequestDto,
	) {
		return this.ordersService.createRefundRequest(id, user.id, user.role, dto)
	}
}
