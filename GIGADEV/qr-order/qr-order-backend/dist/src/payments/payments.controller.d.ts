import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { InitiateOrderResponseDto, PaymentConfirmationResponseDto } from './interfaces/payment-response.interface';
export declare class ConfirmPaymentDto {
    paymentKey: string;
    orderId: string;
    amount: number;
    storeId: string;
}
export declare class CancelOrderDto {
    orderId: string;
    storeId: string;
    reason?: string;
}
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    initiateOrder(createOrderDto: CreateOrderDto): Promise<InitiateOrderResponseDto>;
    getOrderById(orderId: string, storeId: string): Promise<{
        orderId: string;
        amount: number;
        status: import("./entities/order.entity").OrderStatus;
        storeId: string;
        orderName: string | undefined;
        method: string | undefined;
        approvedAt: Date | undefined;
        receiptUrl: string | undefined;
        createdAt: Date;
        updatedAt: Date;
        orderItems: {
            productId: string;
            quantity: number;
            priceAtOrder: number;
            name: string;
        }[];
    }>;
    cancelOrder(cancelOrderDto: CancelOrderDto): Promise<{
        success: boolean;
        message: string;
        order: {
            orderId: string;
            status: import("./entities/order.entity").OrderStatus.FAILED | import("./entities/order.entity").OrderStatus.CANCELED;
        };
    } | {
        success: boolean;
        message: string;
        order: {
            orderId: string;
            status: import("./entities/order.entity").OrderStatus.PAID;
        };
    }>;
    confirmPayment(confirmPaymentDto: ConfirmPaymentDto): Promise<PaymentConfirmationResponseDto>;
    test(): {
        success: boolean;
        message: string;
        timestamp: string;
    };
    getProductsByStore(storeId: string): Promise<import("./entities/product.entity").Product[]>;
}
