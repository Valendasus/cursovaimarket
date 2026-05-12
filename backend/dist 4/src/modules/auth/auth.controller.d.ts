import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, res: Response): Promise<{
        user: any;
        accessToken: string;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        user: any;
        accessToken: string;
    }>;
    refresh(req: Request, res: Response): Promise<{
        user: any;
        accessToken: string;
    }>;
    logout(res: Response): {
        message: string;
    };
    getMe(user: any): any;
}
