import { UserRole } from '@prisma/client';
export declare class UpdateUserDto {
    name?: string;
    avatar?: string;
}
export declare class UpdateProfileDto {
    bio?: string;
    telegram?: string;
    specializations?: string[];
}
export declare class SwitchRoleDto {
    role: UserRole;
}
