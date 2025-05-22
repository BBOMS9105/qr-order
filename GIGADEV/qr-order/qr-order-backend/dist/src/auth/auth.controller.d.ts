import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { Request } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
interface AuthenticatedUser {
    id: string;
    storeId?: string;
}
interface RequestWithUser extends Request {
    user: AuthenticatedUser;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    registerOwner(createUserDto: CreateUserDto): Promise<{
        id: string;
        businessRegistrationNumber?: string;
        phoneNumber?: string;
        name?: string;
        usageMonths?: number;
        isActive?: boolean;
        store?: import("../payments/entities/store.entity").Store;
        storeId?: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(storeId: string, loginUserDto: LoginUserDto): Promise<{
        accessToken: string;
        refreshToken: string;
        message: string;
        user: Omit<import("../users/entities/user.entity").User, "password" | "salt" | "refreshToken">;
        storeId: string;
    }>;
    verifyToken(storeId: string, req: Request): Promise<{
        valid: boolean;
        storeId: string;
    }>;
    refreshTokens(req: RequestWithUser, refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(req: RequestWithUser): Promise<{
        message: string;
    }>;
}
export {};
