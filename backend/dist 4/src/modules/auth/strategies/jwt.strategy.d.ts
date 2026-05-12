import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
        profile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            bio: string;
            rating: number;
            reviewsCount: number;
            completedOrders: number;
            specializations: string[];
            isVerified: boolean;
            telegram: string | null;
            responseTime: string;
            location: string | null;
            userId: string;
        } | null;
    }>;
}
export {};
