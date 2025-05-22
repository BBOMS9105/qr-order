import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { Store } from '../payments/entities/store.entity';
export declare class UsersController {
    private readonly usersService;
    private readonly storeRepository;
    constructor(usersService: UsersService, storeRepository: Repository<Store>);
    registerUser(createUserDto: CreateUserDto): Promise<{
        message: string;
        user: {
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
        };
    }>;
    getAllStores(): Promise<{
        count: number;
        stores: Store[];
    }>;
    getStoreById(storeId: string): Promise<Store>;
}
