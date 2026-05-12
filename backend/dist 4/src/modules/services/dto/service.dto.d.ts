import { ServiceCategory, ServiceLevel } from '@prisma/client';
export declare class CreatePackageDto {
    name: string;
    price: number;
    deliveryDays: number;
    revisions?: number;
    description?: string;
    features?: string[];
}
export declare class CreateServiceDto {
    title: string;
    description: string;
    category: ServiceCategory;
    level: ServiceLevel;
    tags?: string[];
    images?: string[];
    packages: CreatePackageDto[];
}
export declare class UpdateServiceDto {
    title?: string;
    description?: string;
    category?: ServiceCategory;
    level?: ServiceLevel;
    tags?: string[];
    images?: string[];
}
export declare class ServiceFiltersDto {
    category?: ServiceCategory;
    level?: ServiceLevel;
    search?: string;
    freelancerId?: string;
    isFeatured?: boolean;
    page?: number;
    limit?: number;
}
