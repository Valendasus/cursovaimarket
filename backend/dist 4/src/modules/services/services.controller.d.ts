import { CreateServiceDto, ServiceFiltersDto, UpdateServiceDto } from './dto/service.dto';
import { ServicesService } from './services.service';
export declare class ServicesController {
    private readonly servicesService;
    constructor(servicesService: ServicesService);
    findAll(filters: ServiceFiltersDto): Promise<{
        data: ({
            freelancer: {
                id: string;
                name: string;
                avatar: string | null;
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
            };
            packages: {
                id: string;
                name: string;
                serviceId: string;
                description: string | null;
                price: number;
                deliveryDays: number;
                revisions: number;
                features: string[];
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            rating: number;
            reviewsCount: number;
            description: string;
            freelancerId: string;
            title: string;
            category: import(".prisma/client").$Enums.ServiceCategory;
            level: import(".prisma/client").$Enums.ServiceLevel;
            tags: string[];
            thumbnail: string | null;
            images: string[];
            ordersCount: number;
            isFeatured: boolean;
            isActive: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<{
        reviews: ({
            author: {
                id: string;
                name: string;
                avatar: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            rating: number;
            serviceId: string;
            orderId: string;
            comment: string | null;
            authorId: string;
        })[];
        freelancer: {
            id: string;
            name: string;
            avatar: string | null;
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
        };
        packages: {
            id: string;
            name: string;
            serviceId: string;
            description: string | null;
            price: number;
            deliveryDays: number;
            revisions: number;
            features: string[];
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        reviewsCount: number;
        description: string;
        freelancerId: string;
        title: string;
        category: import(".prisma/client").$Enums.ServiceCategory;
        level: import(".prisma/client").$Enums.ServiceLevel;
        tags: string[];
        thumbnail: string | null;
        images: string[];
        ordersCount: number;
        isFeatured: boolean;
        isActive: boolean;
    }>;
    create(userId: string, dto: CreateServiceDto): Promise<{
        packages: {
            id: string;
            name: string;
            serviceId: string;
            description: string | null;
            price: number;
            deliveryDays: number;
            revisions: number;
            features: string[];
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        reviewsCount: number;
        description: string;
        freelancerId: string;
        title: string;
        category: import(".prisma/client").$Enums.ServiceCategory;
        level: import(".prisma/client").$Enums.ServiceLevel;
        tags: string[];
        thumbnail: string | null;
        images: string[];
        ordersCount: number;
        isFeatured: boolean;
        isActive: boolean;
    }>;
    update(id: string, userId: string, dto: UpdateServiceDto): Promise<{
        packages: {
            id: string;
            name: string;
            serviceId: string;
            description: string | null;
            price: number;
            deliveryDays: number;
            revisions: number;
            features: string[];
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        reviewsCount: number;
        description: string;
        freelancerId: string;
        title: string;
        category: import(".prisma/client").$Enums.ServiceCategory;
        level: import(".prisma/client").$Enums.ServiceLevel;
        tags: string[];
        thumbnail: string | null;
        images: string[];
        ordersCount: number;
        isFeatured: boolean;
        isActive: boolean;
    }>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
}
