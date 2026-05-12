"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(studentId, dto) {
        const pkg = await this.prisma.servicePackage.findUnique({
            where: { id: dto.packageId },
            include: { service: true },
        });
        if (!pkg)
            throw new common_1.NotFoundException('Пакет не найден');
        if (!pkg.service.isActive)
            throw new common_1.BadRequestException('Услуга недоступна для заказа');
        if (pkg.service.freelancerId === studentId)
            throw new common_1.BadRequestException('Нельзя заказать собственную услугу');
        const order = await this.prisma.order.create({
            data: {
                studentId,
                freelancerId: pkg.service.freelancerId,
                serviceId: pkg.service.id,
                packageId: dto.packageId,
                totalPrice: pkg.price,
                requirements: dto.requirements,
                status: client_1.OrderStatus.PENDING,
            },
            include: {
                service: true,
                package: true,
                student: { select: { id: true, name: true, avatar: true } },
                freelancer: { select: { id: true, name: true, avatar: true } },
            },
        });
        return order;
    }
    async findMyOrders(userId, role) {
        const where = role === client_1.UserRole.FREELANCER
            ? { freelancerId: userId }
            : { studentId: userId };
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
        });
    }
    async findOne(id, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                service: true,
                package: true,
                student: { select: { id: true, name: true, avatar: true } },
                freelancer: { select: { id: true, name: true, avatar: true } },
                review: true,
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Заказ не найден');
        if (order.studentId !== userId && order.freelancerId !== userId) {
            throw new common_1.ForbiddenException('Нет доступа');
        }
        return order;
    }
    async updateStatus(id, userId, dto) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('Заказ не найден');
        if (order.freelancerId !== userId && order.studentId !== userId) {
            throw new common_1.ForbiddenException('Нет доступа');
        }
        const terminal = [
            client_1.OrderStatus.COMPLETED,
            client_1.OrderStatus.CANCELLED,
        ];
        if (terminal.includes(order.status)) {
            throw new common_1.BadRequestException(`Нельзя изменить статус: заказ уже ${order.status === client_1.OrderStatus.COMPLETED ? 'завершён' : 'отменён'}`);
        }
        const isFreelancer = order.freelancerId === userId;
        const isStudent = order.studentId === userId;
        const allowedForFreelancer = [
            client_1.OrderStatus.IN_PROGRESS,
            client_1.OrderStatus.REVIEW,
            client_1.OrderStatus.COMPLETED,
            client_1.OrderStatus.CANCELLED,
        ];
        const allowedForStudent = [
            client_1.OrderStatus.REVISION,
            client_1.OrderStatus.COMPLETED,
            client_1.OrderStatus.CANCELLED,
        ];
        if (isFreelancer && !allowedForFreelancer.includes(dto.status)) {
            throw new common_1.ForbiddenException('Недопустимый статус для фрилансера');
        }
        if (isStudent && !allowedForStudent.includes(dto.status)) {
            throw new common_1.ForbiddenException('Недопустимый статус для заказчика');
        }
        const validTransitions = {
            [client_1.OrderStatus.PENDING]: [client_1.OrderStatus.IN_PROGRESS, client_1.OrderStatus.CANCELLED],
            [client_1.OrderStatus.ACCEPTED]: [client_1.OrderStatus.IN_PROGRESS, client_1.OrderStatus.CANCELLED],
            [client_1.OrderStatus.IN_PROGRESS]: [
                client_1.OrderStatus.REVIEW,
                client_1.OrderStatus.COMPLETED,
                client_1.OrderStatus.CANCELLED,
            ],
            [client_1.OrderStatus.REVIEW]: [client_1.OrderStatus.COMPLETED, client_1.OrderStatus.REVISION],
            [client_1.OrderStatus.REVISION]: [client_1.OrderStatus.IN_PROGRESS, client_1.OrderStatus.CANCELLED],
        };
        const allowedNext = validTransitions[order.status] ?? [];
        if (!allowedNext.includes(dto.status)) {
            throw new common_1.BadRequestException(`Переход из статуса ${order.status} в ${dto.status} недопустим`);
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
        });
        if (dto.status === client_1.OrderStatus.COMPLETED) {
            await Promise.all([
                this.prisma.freelancerProfile.updateMany({
                    where: { userId: order.freelancerId },
                    data: { completedOrders: { increment: 1 } },
                }),
                this.prisma.service.update({
                    where: { id: order.serviceId },
                    data: { ordersCount: { increment: 1 } },
                }),
            ]);
        }
        return updated;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map