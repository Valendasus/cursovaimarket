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
			OrderStatus.COMPLETED,
			OrderStatus.CANCELLED,
		]
		const allowedForStudent: OrderStatus[] = [OrderStatus.CANCELLED]

		if (isFreelancer && !allowedForFreelancer.includes(dto.status)) {
			throw new BadRequestException('Фрилансер не может установить этот статус')
		}
		if (isStudent && !allowedForStudent.includes(dto.status)) {
			throw new BadRequestException('Студент может только отменить заказ')
		}

		return this.prisma.order.update({
			where: { id },
			data: { status: dto.status },
			include: {
				service: { select: { id: true, title: true } },
				package: true,
				student: { select: { id: true, name: true } },
				freelancer: { select: { id: true, name: true } },
			},
		})
	}
}
