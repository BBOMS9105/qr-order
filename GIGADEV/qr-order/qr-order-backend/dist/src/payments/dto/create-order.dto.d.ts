export declare class OrderItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    storeId: string;
    orderItems: OrderItemDto[];
}
