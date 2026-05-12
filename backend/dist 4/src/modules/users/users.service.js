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
exports.UsersService = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { profile: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        const { password, ...safe } = user;
        return safe;
    }
    async findFreelancers(page = 1, limit = 12) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where: { role: client_1.UserRole.FREELANCER },
                include: {
                    profile: true,
                    services: { select: { id: true, rating: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where: { role: client_1.UserRole.FREELANCER } }),
        ]);
        const safe = data.map(({ password, ...u }) => u);
        return { data: safe, total, page, limit };
    }
    async updateMe(userId, dto) {
        if (dto.name) {
            const taken = await this.prisma.user.findUnique({
                where: { name: dto.name },
            });
            if (taken && taken.id !== userId) {
                throw new common_1.ConflictException('Пользователь с таким никнеймом уже существует');
            }
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: dto,
            include: { profile: true },
        });
        const { password, ...safe } = user;
        return safe;
    }
    async updateProfile(userId, dto) {
        const profile = await this.prisma.freelancerProfile.upsert({
            where: { userId },
            create: { userId, ...dto },
            update: dto,
        });
        return profile;
    }
    async switchRole(userId, dto) {
        if (dto.role !== client_1.UserRole.STUDENT && dto.role !== client_1.UserRole.FREELANCER) {
            throw new common_1.BadRequestException('Можно переключаться только между ролями STUDENT и FREELANCER');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        if (user.role === dto.role) {
            throw new common_1.BadRequestException('У вас уже установлена эта роль');
        }
        const [updated] = await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    role: dto.role,
                    ...(dto.role === client_1.UserRole.FREELANCER && !user.profile
                        ? { profile: { create: {} } }
                        : {}),
                },
                include: { profile: true },
            }),
            this.prisma.service.updateMany({
                where: { freelancerId: userId },
                data: { isActive: dto.role === client_1.UserRole.FREELANCER },
            }),
        ]);
        const { password, ...safe } = updated;
        return safe;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map