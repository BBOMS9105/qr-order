import { Order } from './order.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from './product.entity';
export declare class Store {
    id: string;
    name: string;
    address: string;
    createdAt: Date;
    users: User[];
    orders: Order[];
    products: Product[];
}
