import { PrismaService } from '@/prisma/prisma.service'
import {
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

		// Only freelancer can change status to IN_PROGRESS, COMPLETED, CANCELLED
		// Only student can CANCEL
		if (order.freelancerId !== userId && order.studentId !== userId) {
			throw new ForbiddenException('Нет доступа')
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
