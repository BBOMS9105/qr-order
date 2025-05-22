import { OrderStatus } from '../entities/order.entity';
export interface OrderResponseDto {
    orderId: string;
    amount: number;
    status: OrderStatus;
    method?: string;
    approvedAt?: Date;
    receiptUrl?: string;
}
export interface OrderItemResponseDto {
    productId: string;
    quantity: number;
    priceAtOrder: number;
    name?: string;
}
export interface InitiateOrderResponseDto {
    orderId: string;
    orderName: string;
    amount: number;
    storeId: string;
    orderItems: OrderItemResponseDto[];
}
export interface OrderDataResponseDto {
    orderId: string;
    orderItems: OrderItemResponseDto[];
}
export interface PaymentConfirmationResponseDto {
    success: boolean;
    message: string;
    order: OrderResponseDto;
    orderData?: OrderDataResponseDto;
}
