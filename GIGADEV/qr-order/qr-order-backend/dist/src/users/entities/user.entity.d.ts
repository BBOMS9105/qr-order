import { Store } from '../../payments/entities/store.entity';
export declare class User {
    id: string;
    businessRegistrationNumber?: string;
    phoneNumber?: string;
    name?: string;
    password: string;
    salt: string;
    usageMonths?: number;
    isActive?: boolean;
    refreshToken?: string | null;
    store?: Store;
    storeId?: string;
    createdAt: Date;
    updatedAt: Date;
    constructor();
}
