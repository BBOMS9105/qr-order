import { PaymentsService } from './payments.service';
import { Request } from 'express';
export declare class ProductDto {
    name: string;
    description?: string;
    price: number;
    image?: string;
    storeId: string;
    isAvailable?: boolean;
}
export declare class GetProductsQueryDto {
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    searchTerm?: string;
}
interface RequestWithUser extends Request {
    user: {
        id: string;
        storeId?: string;
        [key: string]: any;
    };
}
export declare class ProductsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    private validateStoreAccess;
    getProducts(storeId: string, req: RequestWithUser, query: GetProductsQueryDto): Promise<import("./entities/product.entity").Product[]>;
    getProduct(storeId: string, productId: string, req: RequestWithUser): Promise<import("./entities/product.entity").Product>;
    createProduct(storeId: string, productDto: ProductDto, req: RequestWithUser, imageFile?: any): Promise<import("./entities/product.entity").Product>;
    updateProduct(storeId: string, productId: string, productDto: ProductDto, req: RequestWithUser, imageFile?: any): Promise<import("./entities/product.entity").Product | null>;
    deleteProduct(storeId: string, productId: string, req: RequestWithUser): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
