import { SwitchRoleDto, UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getFreelancers(page: number, limit: number): Promise<{
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
    getMe(userId: string): Promise<{
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
    findOne(id: string): Promise<{
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
