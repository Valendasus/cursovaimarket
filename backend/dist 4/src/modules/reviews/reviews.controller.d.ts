import { CreateReviewDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(userId: string, dto: CreateReviewDto): Promise<{
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
    myReviews(userId: string, page: number, limit: number): Promise<{
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
    receivedReviews(userId: string, page: number, limit: number): Promise<{
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
    forService(serviceId: string, page: number, limit: number): Promise<{
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
}
