import { Store } from './store.entity';
export declare class Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    isAvailable: boolean;
    store: Store;
    storeId: string;
    createdAt: Date;
    updatedAt: Date;
}
