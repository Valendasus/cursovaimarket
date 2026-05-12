import { OrderStatus } from '@prisma/client';
export declare class CreateOrderDto {
    packageId: string;
    requirements?: string;
}
export declare class UpdateOrderStatusDto {
    status: OrderStatus;
}
