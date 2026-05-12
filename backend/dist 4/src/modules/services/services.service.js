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
exports.ServicesService = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
let ServicesService = class ServicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(filters) {
        const { category, level, search, page = 1, limit = 12, freelancerId, isFeatured, } = filters;
        const skip = (page - 1) * limit;
        const where = {
            isActive: true,
            ...(category && { category }),
            ...(level && { level }),
            ...(freelancerId && { freelancerId }),
            ...(isFeatured !== undefined && { isFeatured }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { tags: { has: search } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            this.prisma.service.findMany({
                where,
                include: {
                    freelancer: {
                        select: { id: true, name: true, avatar: true, profile: true },
                    },
                    packages: { orderBy: { price: 'asc' } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.service.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async findOne(id) {
        const service = await this.prisma.service.findUnique({
            where: { id },
            include: {
                freelancer: {
                    select: { id: true, name: true, avatar: true, profile: true },
                },
                packages: { orderBy: { price: 'asc' } },
                reviews: {
                    include: {
                        author: { select: { id: true, name: true, avatar: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!service || !service.isActive)
            throw new common_1.NotFoundException('Услуга не найдена');
        return service;
    }
    async create(freelancerId, dto) {
        const { packages, ...serviceData } = dto;
        const service = await this.prisma.service.create({
            data: {
                ...serviceData,
                freelancerId,
                packages: { create: packages },
            },
            include: { packages: true },
        });
        return service;
    }
    async update(id, userId, dto) {
        const service = await this.prisma.service.findUnique({ where: { id } });
        if (!service)
            throw new common_1.NotFoundException('Услуга не найдена');
        if (service.freelancerId !== userId) {
            throw new common_1.ForbiddenException('Нет доступа');
        }
        return this.prisma.service.update({
            where: { id },
            data: dto,
            include: { packages: true },
        });
    }
    async remove(id, userId) {
        const service = await this.prisma.service.findUnique({ where: { id } });
        if (!service)
            throw new common_1.NotFoundException('Услуга не найдена');
        if (service.freelancerId !== userId) {
            throw new common_1.ForbiddenException('Нет доступа');
        }
        await this.prisma.service.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'Услуга удалена' };
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServicesService);
//# sourceMappingURL=services.service.js.map