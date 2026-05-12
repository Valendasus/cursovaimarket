import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(userId: string, dto: CreateOrderDto): Promise<{
        service: {
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
        };
        freelancer: {
            id: string;
            name: string;
            avatar: string | null;
        };
        package: {
            id: string;
            name: string;
            serviceId: string;
            description: string | null;
            price: number;
            deliveryDays: number;
            revisions: number;
            features: string[];
        };
        student: {
            id: string;
            name: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        serviceId: string;
        freelancerId: string;
        packageId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requirements: string | null;
        totalPrice: number;
        deadline: Date | null;
    }>;
    findMine(user: any): Promise<({
        service: {
            id: string;
            title: string;
            images: string[];
        };
        freelancer: {
            id: string;
            name: string;
            avatar: string | null;
        };
        package: {
            id: string;
            name: string;
            serviceId: string;
            description: string | null;
            price: number;
            deliveryDays: number;
            revisions: number;
            features: string[];
        };
        student: {
            id: string;
            name: string;
            avatar: string | null;
        };
        review: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            rating: number;
            serviceId: string;
            orderId: string;
            comment: string | null;
            authorId: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        serviceId: string;
        freelancerId: string;
        packageId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requirements: string | null;
        totalPrice: number;
        deadline: Date | null;
    })[]>;
    findOne(id: string, userId: string): Promise<{
        service: {
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
        };
        freelancer: {
            id: string;
            name: string;
            avatar: string | null;
        };
        package: {
            id: string;
            name: string;
            serviceId: string;
            description: string | null;
            price: number;
            deliveryDays: number;
            revisions: number;
            features: string[];
        };
        student: {
            id: string;
            name: string;
            avatar: string | null;
        };
        review: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            rating: number;
            serviceId: string;
            orderId: string;
            comment: string | null;
            authorId: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        serviceId: string;
        freelancerId: string;
        packageId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requirements: string | null;
        totalPrice: number;
        deadline: Date | null;
    }>;
    updateStatus(id: string, userId: string, dto: UpdateOrderStatusDto): Promise<{
        service: {
            id: string;
            title: string;
        };
        freelancer: {
            id: string;
            name: string;
        };
        package: {
            id: string;
            name: string;
            serviceId: string;
            description: string | null;
            price: number;
            deliveryDays: number;
            revisions: number;
            features: string[];
        };
        student: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        serviceId: string;
        freelancerId: string;
        packageId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        requirements: string | null;
        totalPrice: number;
        deadline: Date | null;
    }>;
}
