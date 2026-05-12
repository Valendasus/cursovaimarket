"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('Пользователь с таким email уже существует');
        }
        const existingName = await this.prisma.user.findUnique({
            where: { name: dto.name },
        });
        if (existingName) {
            throw new common_1.ConflictException('Пользователь с таким никнеймом уже существует');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                role: dto.role,
                ...(dto.role === client_1.UserRole.FREELANCER && {
                    profile: { create: {} },
                }),
            },
            include: { profile: true },
        });
        const accessToken = await this.generateAccessToken(user.id, user.email, user.role, user.name);
        const refreshToken = await this.generateRefreshToken(user.id, user.email, user.role, user.name);
        return { user: this.sanitizeUser(user), accessToken, refreshToken };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { profile: true },
        });
        if (!user || !(await bcrypt.compare(dto.password, user.password))) {
            throw new common_1.UnauthorizedException('Неверный email или пароль');
        }
        const accessToken = await this.generateAccessToken(user.id, user.email, user.role, user.name);
        const refreshToken = await this.generateRefreshToken(user.id, user.email, user.role, user.name);
        return { user: this.sanitizeUser(user), accessToken, refreshToken };
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload = await this.jwt.verifyAsync(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Недействительный refresh token');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { profile: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Пользователь не найден');
        }
        const accessToken = await this.generateAccessToken(user.id, user.email, user.role, user.name);
        const newRefreshToken = await this.generateRefreshToken(user.id, user.email, user.role, user.name);
        return {
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken: newRefreshToken,
        };
    }
    logout() {
        return { message: 'Выход выполнен' };
    }
    async generateAccessToken(userId, email, role, name) {
        return this.jwt.signAsync({ sub: userId, email, role, name, jti: (0, crypto_1.randomUUID)() }, {
            secret: this.config.get('JWT_SECRET'),
            expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
        });
    }
    async generateRefreshToken(userId, email, role, name) {
        return this.jwt.signAsync({ sub: userId, email, role, name, jti: (0, crypto_1.randomUUID)() }, {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
        });
    }
    sanitizeUser(user) {
        const { password, ...safe } = user;
        return safe;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map