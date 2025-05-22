import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Product } from './entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentConfirmationResponseDto } from './interfaces/payment-response.interface';
import { ProductDto } from './products.controller';
export declare class PaymentsService {
    private readonly orderRepository;
    private readonly productRepository;
    private readonly orderItemRepository;
    private readonly httpService;
    private readonly configService;
    private readonly dataSource;
    constructor(orderRepository: Repository<Order>, productRepository: Repository<Product>, orderItemRepository: Repository<OrderItem>, httpService: HttpService, configService: ConfigService, dataSource: DataSource);
    createInitialOrder(createOrderDto: CreateOrderDto): Promise<Order>;
    confirmPayment(paymentKey: string, orderId: string, amount: number, storeId: string): Promise<PaymentConfirmationResponseDto>;
    getProductsByStore(storeId: string, sortBy?: string, order?: 'ASC' | 'DESC', searchTerm?: string): Promise<Product[]>;
    getProductById(productId: string, storeId: string): Promise<Product | null>;
    createProduct(productDto: ProductDto, imageFile?: any): Promise<Product>;
    updateProduct(productId: string, productDto: ProductDto, imageFile?: any): Promise<Product | null>;
    deleteProduct(productId: string, storeId: string): Promise<void>;
    getOrderById(orderId: string, storeId: string): Promise<{
        orderId: string;
        amount: number;
        status: OrderStatus;
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
    cancelOrder(orderId: string, storeId: string, reason?: string): Promise<{
        success: boolean;
        message: string;
        order: {
            orderId: string;
            status: OrderStatus.FAILED | OrderStatus.CANCELED;
        };
    } | {
        success: boolean;
        message: string;
        order: {
            orderId: string;
            status: OrderStatus.PAID;
        };
    }>;
}
