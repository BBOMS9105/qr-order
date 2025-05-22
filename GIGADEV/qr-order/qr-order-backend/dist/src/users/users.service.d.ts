import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    private hashRefreshToken;
    createUser(userData: Partial<User>): Promise<User>;
    findOneById(id: string): Promise<User | null>;
    findByLoginIdentifier(identifier: string): Promise<User | null>;
    findByStoreId(storeId: string): Promise<User | null>;
    setCurrentRefreshToken(refreshToken: string, userId: string): Promise<void>;
    getUserIfRefreshTokenMatches(refreshToken: string, userId: string): Promise<User | null>;
    removeRefreshToken(userId: string): Promise<void>;
    updateUser(userId: string, updateData: Partial<User>): Promise<User | null>;
    deleteUser(userId: string): Promise<void>;
}
