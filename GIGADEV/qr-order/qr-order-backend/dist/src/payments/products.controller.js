"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = exports.GetProductsQueryDto = exports.ProductDto = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const class_validator_1 = require("class-validator");
const platform_express_1 = require("@nestjs/platform-express");
const class_transformer_1 = require("class-transformer");
class ProductDto {
}
exports.ProductDto = ProductDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProductDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ProductDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ProductDto.prototype, "image", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProductDto.prototype, "storeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        console.log('[Transformer Debug] Received value for isAvailable - type:', typeof value, ', value:', value);
        if (value === 'true' || value === true || value === '1')
            return true;
        if (value === 'false' || value === false || value === '0')
            return false;
        console.log('[Transformer Debug] Value not transformed to boolean, returning original:', value);
        return undefined;
    }),
    __metadata("design:type", Boolean)
], ProductDto.prototype, "isAvailable", void 0);
class GetProductsQueryDto {
}
exports.GetProductsQueryDto = GetProductsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetProductsQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ASC', 'DESC']),
    __metadata("design:type", String)
], GetProductsQueryDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetProductsQueryDto.prototype, "searchTerm", void 0);
let ProductsController = class ProductsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    validateStoreAccess(req, storeId) {
        const userStoreId = req.user.storeId;
        if (!userStoreId) {
            throw new common_1.UnauthorizedException('User is not associated with any store');
        }
        if (userStoreId !== storeId) {
            throw new common_1.UnauthorizedException('User does not have access to this store');
        }
        return true;
    }
    async getProducts(storeId, req, query) {
        this.validateStoreAccess(req, storeId);
        return this.paymentsService.getProductsByStore(storeId, query.sortBy, query.order, query.searchTerm);
    }
    async getProduct(storeId, productId, req) {
        this.validateStoreAccess(req, storeId);
        const product = await this.paymentsService.getProductById(productId, storeId);
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        return product;
    }
    async createProduct(storeId, productDto, req, imageFile) {
        this.validateStoreAccess(req, storeId);
        if (productDto.storeId !== storeId) {
            throw new common_1.UnauthorizedException('Store ID mismatch');
        }
        return this.paymentsService.createProduct(productDto, imageFile);
    }
    async updateProduct(storeId, productId, productDto, req, imageFile) {
        console.log('[Controller Debug] Request Content-Type:', req.headers['content-type']);
        console.log('[Controller Debug] Received productDto:', JSON.stringify(productDto, null, 2));
        console.log('[Controller Debug] isAvailable value:', productDto.isAvailable);
        this.validateStoreAccess(req, storeId);
        if (productDto.storeId !== storeId) {
            throw new common_1.UnauthorizedException('Store ID mismatch');
        }
        const existingProduct = await this.paymentsService.getProductById(productId, storeId);
        if (!existingProduct) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        return this.paymentsService.updateProduct(productId, productDto, imageFile);
    }
    async deleteProduct(storeId, productId, req) {
        this.validateStoreAccess(req, storeId);
        const existingProduct = await this.paymentsService.getProductById(productId, storeId);
        if (!existingProduct) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found`);
        }
        await this.paymentsService.deleteProduct(productId, storeId);
        return { success: true, message: 'Product deleted successfully' };
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Get)(':storeId/products'),
    __param(0, (0, common_1.Param)('storeId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true, skipMissingProperties: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, GetProductsQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)(':storeId/products/:productId'),
    __param(0, (0, common_1.Param)('storeId')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Post)(':storeId/products'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    __param(0, (0, common_1.Param)('storeId')),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe())),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ProductDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Put)(':storeId/products/:productId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    __param(0, (0, common_1.Param)('storeId')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)(new common_1.ValidationPipe({ transform: true }))),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ProductDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)(':storeId/products/:productId'),
    __param(0, (0, common_1.Param)('storeId')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "deleteProduct", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)('shop/manage'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map