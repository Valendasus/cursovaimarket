import { PrismaService } from '@/prisma/prisma.service'
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { OrderStatus, UserRole } from '@prisma/client'
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto'

@Injectable()
export class OrdersService {
	constructor(private prisma: PrismaService) {}

	async create(studentId: string, dto: CreateOrderDto) {
		const pkg = await this.prisma.servicePackage.findUnique({
			where: { id: dto.packageId },
			include: { service: true },
		})
		if (!pkg) throw new NotFoundException('Пакет не найден')
		if (!pkg.service.isActive)
			throw new BadRequestException('Услуга недоступна для заказа')
		if (pkg.service.freelancerId === studentId)
			throw new BadRequestException('Нельзя заказать собственную услугу')

		const order = await this.prisma.order.create({
			data: {
				studentId,
				freelancerId: pkg.service.freelancerId,
				serviceId: pkg.service.id,
				packageId: dto.packageId,
				totalPrice: pkg.price,
				requirements: dto.requirements,
				status: OrderStatus.PENDING,
			},
			include: {
				service: true,
				package: true,
				student: { select: { id: true, name: true, avatar: true } },
				freelancer: { select: { id: true, name: true, avatar: true } },
			},
		})

		return order
	}

	async findMyOrders(userId: string, role: UserRole) {
		const where =
			role === UserRole.FREELANCER
				? { freelancerId: userId }
				: { studentId: userId }

		return this.prisma.order.findMany({
			where,
			include: {
				service: { select: { id: true, title: true, images: true } },
				package: true,
				student: { select: { id: true, name: true, avatar: true } },
				freelancer: { select: { id: true, name: true, avatar: true } },
				review: true,
			},
			orderBy: { createdAt: 'desc' },
		})
	}

	async findOne(id: string, userId: string) {
		const order = await this.prisma.order.findUnique({
			where: { id },
			include: {
				service: true,
				package: true,
				student: { select: { id: true, name: true, avatar: true } },
				freelancer: { select: { id: true, name: true, avatar: true } },
				review: true,
			},
		})

		if (!order) throw new NotFoundException('Заказ не найден')
		if (order.studentId !== userId && order.freelancerId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}

		return order
	}

	async updateStatus(id: string, userId: string, dto: UpdateOrderStatusDto) {
		const order = await this.prisma.order.findUnique({ where: { id } })
		if (!order) throw new NotFoundException('Заказ не найден')

		if (order.freelancerId !== userId && order.studentId !== userId) {
			throw new ForbiddenException('Нет доступа')
		}

		// Terminal statuses — no further transitions allowed
		const terminal: OrderStatus[] = [
			OrderStatus.COMPLETED,
			OrderStatus.CANCELLED,
		]
		if (terminal.includes(order.status)) {
			throw new BadRequestException(
				`Нельзя изменить статус: заказ уже ${order.status === OrderStatus.COMPLETED ? 'завершён' : 'отменён'}`,
			)
		}

		// Role-based transition rules
		const isFreelancer = order.freelancerId === userId
		const isStudent = order.studentId === userId
		const allowedForFreelancer: OrderStatus[] = [
			OrderStatus.IN_PROGRESS,
			OrderStatus.REVIEW,
			OrderStatus.COMPLETED,
			OrderStatus.CANCELLED,
		]
		const allowedForStudent: OrderStatus[] = [
			OrderStatus.REVISION,
			OrderStatus.COMPLETED,
			OrderStatus.CANCELLED,
		]

		if (isFreelancer && !allowedForFreelancer.includes(dto.status)) {
			throw new ForbiddenException('Недопустимый статус для фрилансера')
		}
		if (isStudent && !allowedForStudent.includes(dto.status)) {
			throw new ForbiddenException('Недопустимый статус для заказчика')
		}

		// Sequential transition validation
		const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
			[OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
			[OrderStatus.ACCEPTED]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
			[OrderStatus.IN_PROGRESS]: [
				OrderStatus.REVIEW,
				OrderStatus.COMPLETED,
				OrderStatus.CANCELLED,
			],
			[OrderStatus.REVIEW]: [OrderStatus.COMPLETED, OrderStatus.REVISION],
			[OrderStatus.REVISION]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
		}
		const allowedNext = validTransitions[order.status] ?? []
		if (!allowedNext.includes(dto.status)) {
			throw new BadRequestException(
				`Переход из статуса ${order.status} в ${dto.status} недопустим`,
			)
		}

		const updated = await this.prisma.order.update({
			where: { id },
			data: { status: dto.status },
			include: {
				service: { select: { id: true, title: true } },
				package: true,
				student: { select: { id: true, name: true } },
				freelancer: { select: { id: true, name: true } },
			},
		})

		// When completed — increment counters
		if (dto.status === OrderStatus.COMPLETED) {
			await Promise.all([
				// completedOrders on freelancer profile
				// Use updateMany to avoid P2025 if profile row is missing
				this.prisma.freelancerProfile.updateMany({
					where: { userId: order.freelancerId },
					data: { completedOrders: { increment: 1 } },
				}),
				// ordersCount on service
				this.prisma.service.update({
					where: { id: order.serviceId },
					data: { ordersCount: { increment: 1 } },
				}),
			])
		}

		return updated
	}
}
