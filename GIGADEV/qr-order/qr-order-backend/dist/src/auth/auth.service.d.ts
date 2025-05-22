import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Store } from '../payments/entities/store.entity';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly configService;
    private readonly storeRepository;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, storeRepository: Repository<Store>);
    private hashPassword;
    private generateSalt;
    validateUserByStore(storeId: string, pass: string): Promise<Omit<User, 'password' | 'salt' | 'refreshToken'> | null>;
    login(loginUserDto: LoginUserDto): Promise<{
        accessToken: string;
        refreshToken: string;
        message: string;
        user: Omit<User, "password" | "salt" | "refreshToken">;
        storeId: string;
    }>;
    private _generateTokens;
    refreshTokens(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    validateTokenAndStore(token: string, storeId: string): Promise<boolean>;
    registerOwner(createUserDto: Omit<LoginUserDto, 'storeId'> & {
        name?: string;
        businessRegistrationNumber: string;
        phoneNumber?: string;
        storeId: string;
    }): Promise<{
        id: string;
        businessRegistrationNumber?: string;
        phoneNumber?: string;
        name?: string;
        usageMonths?: number;
        isActive?: boolean;
        store?: Store;
        storeId?: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
