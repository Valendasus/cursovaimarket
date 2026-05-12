import { PrismaService } from '@/prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(authorId: string, dto: CreateReviewDto): Promise<{
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
    }>;
    findForService(serviceId: string, page?: number, limit?: number): Promise<{
        data: ({
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
        total: number;
        page: number;
        limit: number;
    }>;
    findByAuthor(authorId: string, page?: number, limit?: number): Promise<{
        data: ({
            service: {
                id: string;
                title: string;
                freelancer: {
                    id: string;
                    name: string;
                    avatar: string | null;
                };
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
        total: number;
        page: number;
        limit: number;
    }>;
    findForFreelancer(freelancerId: string, page?: number, limit?: number): Promise<{
        data: ({
            service: {
                id: string;
                title: string;
            };
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
        total: number;
        page: number;
        limit: number;
    }>;
}
