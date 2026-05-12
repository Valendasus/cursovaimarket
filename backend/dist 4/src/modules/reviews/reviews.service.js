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
exports.ReviewsService = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let ReviewsService = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(authorId, dto) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { review: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Заказ не найден');
        if (order.studentId !== authorId)
            throw new common_1.ForbiddenException('Нет доступа');
        if (order.status !== client_1.OrderStatus.COMPLETED) {
            throw new common_1.BadRequestException('Можно оставить отзыв только по завершённому заказу');
        }
        if (order.review) {
            throw new common_1.ConflictException('Отзыв уже оставлен');
        }
        const review = await this.prisma.review.create({
            data: {
                authorId,
                serviceId: order.serviceId,
                orderId: dto.orderId,
                rating: dto.rating,
                comment: dto.comment,
            },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
            },
        });
        const stats = await this.prisma.review.aggregate({
            where: { serviceId: order.serviceId },
            _avg: { rating: true },
            _count: true,
        });
        const profileStats = await this.prisma.review.aggregate({
            where: { service: { freelancerId: order.freelancerId } },
            _avg: { rating: true },
            _count: true,
        });
        await Promise.all([
            this.prisma.service.update({
                where: { id: order.serviceId },
                data: {
                    rating: stats._avg.rating ?? 0,
                    reviewsCount: stats._count,
                },
            }),
            this.prisma.freelancerProfile.updateMany({
                where: { userId: order.freelancerId },
                data: {
                    rating: profileStats._avg.rating ?? 0,
                    reviewsCount: profileStats._count,
                },
            }),
        ]);
        return review;
    }
    async findForService(serviceId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.review.findMany({
                where: { serviceId },
                include: {
                    author: { select: { id: true, name: true, avatar: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.review.count({ where: { serviceId } }),
        ]);
        return { data, total, page, limit };
    }
    async findByAuthor(authorId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.review.findMany({
                where: { authorId },
                include: {
                    service: {
                        select: {
                            id: true,
                            title: true,
                            freelancer: {
                                select: { id: true, name: true, avatar: true },
                            },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.review.count({ where: { authorId } }),
        ]);
        return { data, total, page, limit };
    }
    async findForFreelancer(freelancerId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.review.findMany({
                where: { service: { freelancerId } },
                include: {
                    author: { select: { id: true, name: true, avatar: true } },
                    service: { select: { id: true, title: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.review.count({ where: { service: { freelancerId } } }),
        ]);
        return { data, total, page, limit };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map