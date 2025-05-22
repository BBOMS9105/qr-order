import { User } from '../../users/entities/user.entity';
import { Store } from './store.entity';
import { OrderItem } from './order-item.entity';
export declare enum OrderStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    CANCELED = "CANCELED",
    PARTIAL_CANCELED = "PARTIAL_CANCELED",
    REFUNDED = "REFUNDED"
}
export declare class Order {
    id: string;
    orderId: string;
    orderName?: string;
    paymentKey?: string;
    amount: number;
    status: OrderStatus;
    user?: User;
    userId?: string;
    store: Store;
    storeId: string;
    orderItems: OrderItem[];
    approvedAt?: Date;
    method?: string;
    transactionId?: string;
    receiptUrl?: string;
    failReason?: string;
    paymentDetails?: any;
    createdAt: Date;
    updatedAt: Date;
}
