import { PrismaService } from '@/prisma/prisma.service';
import { SwitchRoleDto, UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
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
        id: string;
        email: string;
        name: string;
        avatar: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findFreelancers(page?: number, limit?: number): Promise<{
        data: {
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
            services: {
                id: string;
                rating: number;
            }[];
            id: string;
            email: string;
            name: string;
            avatar: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateMe(userId: string, dto: UpdateUserDto): Promise<{
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
        id: string;
        email: string;
        name: string;
        avatar: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
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
    }>;
    switchRole(userId: string, dto: SwitchRoleDto): Promise<{
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
        id: string;
        email: string;
        name: string;
        avatar: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
