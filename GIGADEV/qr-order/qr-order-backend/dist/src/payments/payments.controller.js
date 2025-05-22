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
exports.PaymentsController = exports.CancelOrderDto = exports.ConfirmPaymentDto = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const class_validator_1 = require("class-validator");
const create_order_dto_1 = require("./dto/create-order.dto");
class ConfirmPaymentDto {
}
exports.ConfirmPaymentDto = ConfirmPaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmPaymentDto.prototype, "paymentKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmPaymentDto.prototype, "orderId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ConfirmPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmPaymentDto.prototype, "storeId", void 0);
class CancelOrderDto {
}
exports.CancelOrderDto = CancelOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CancelOrderDto.prototype, "orderId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CancelOrderDto.prototype, "storeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CancelOrderDto.prototype, "reason", void 0);
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async initiateOrder(createOrderDto) {
        console.log('----------------------------------------');
        console.log('[주문 초기화 요청 수신]');
        console.log('시간:', new Date().toISOString());
        console.log('요청 데이터:', JSON.stringify(createOrderDto, null, 2));
        console.log('----------------------------------------');
        try {
            const order = await this.paymentsService.createInitialOrder(createOrderDto);
            const response = {
                orderId: order.orderId,
                orderName: order.orderName || '상품 주문',
                amount: order.amount,
                storeId: order.storeId,
                orderItems: order.orderItems.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    priceAtOrder: item.priceAtOrder,
                    name: item.product?.name,
                })),
            };
            console.log('[주문 초기화 성공]:', JSON.stringify(response, null, 2));
            return response;
        }
        catch (error) {
            console.error('[주문 초기화 오류]:', error);
            throw error;
        }
    }
    async getOrderById(orderId, storeId) {
        console.log('----------------------------------------');
        console.log('[주문 정보 조회 요청 수신]');
        console.log('시간:', new Date().toISOString());
        console.log('주문 ID:', orderId);
        console.log('상점 ID:', storeId);
        console.log('----------------------------------------');
        try {
            const order = await this.paymentsService.getOrderById(orderId, storeId);
            console.log('[주문 정보 조회 성공]:', JSON.stringify(order, null, 2));
            return order;
        }
        catch (error) {
            console.error('[주문 정보 조회 오류]:', error);
            throw error;
        }
    }
    async cancelOrder(cancelOrderDto) {
        console.log('----------------------------------------');
        console.log('[주문 취소 요청 수신]');
        console.log('시간:', new Date().toISOString());
        console.log('요청 데이터:', JSON.stringify(cancelOrderDto, null, 2));
        console.log('----------------------------------------');
        try {
            const result = await this.paymentsService.cancelOrder(cancelOrderDto.orderId, cancelOrderDto.storeId, cancelOrderDto.reason || '사용자에 의한 결제 취소');
            console.log('[주문 취소 성공]:', JSON.stringify(result, null, 2));
            console.log('----------------------------------------');
            return result;
        }
        catch (error) {
            console.error('[주문 취소 오류]:', error);
            console.error('[주문 취소 실패 상세]:', {
                orderId: cancelOrderDto.orderId,
                storeId: cancelOrderDto.storeId,
                errorMessage: error.message,
                errorStack: error.stack
            });
            console.log('----------------------------------------');
            throw error;
        }
    }
    async confirmPayment(confirmPaymentDto) {
        console.log('----------------------------------------');
        console.log('[결제 확인 요청 수신]');
        console.log('시간:', new Date().toISOString());
        console.log('요청 데이터:', JSON.stringify(confirmPaymentDto, null, 2));
        console.log('----------------------------------------');
        try {
            console.log(`[결제 확인] 토스페이먼츠 결제 승인 시작 - paymentKey: ${confirmPaymentDto.paymentKey}, orderId: ${confirmPaymentDto.orderId}`);
            const result = await this.paymentsService.confirmPayment(confirmPaymentDto.paymentKey, confirmPaymentDto.orderId, confirmPaymentDto.amount, confirmPaymentDto.storeId);
            console.log('[결제 확인 성공]:', JSON.stringify(result, null, 2));
            console.log('----------------------------------------');
            return result;
        }
        catch (error) {
            console.error('[결제 확인 오류]:', error);
            console.error('[결제 확인 실패 상세]:', {
                paymentKey: confirmPaymentDto.paymentKey,
                orderId: confirmPaymentDto.orderId,
                amount: confirmPaymentDto.amount,
                storeId: confirmPaymentDto.storeId,
                errorMessage: error.message,
                errorStack: error.stack
            });
            console.log('----------------------------------------');
            throw error;
        }
    }
    test() {
        console.log('테스트 엔드포인트 호출됨:', new Date().toISOString());
        return {
            success: true,
            message: '백엔드 연결 테스트 성공',
            timestamp: new Date().toISOString(),
        };
    }
    async getProductsByStore(storeId) {
        console.log('----------------------------------------');
        console.log('[스토어 상품 조회 요청 수신]');
        console.log('시간:', new Date().toISOString());
        console.log('스토어 ID:', storeId);
        console.log('----------------------------------------');
        try {
            const products = await this.paymentsService.getProductsByStore(storeId);
            console.log(`[스토어 상품 조회 성공] ${products.length}개 상품 반환`);
            return products;
        }
        catch (error) {
            console.error('[스토어 상품 조회 오류]:', error);
            throw error;
        }
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('initiate'),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "initiateOrder", null);
__decorate([
    (0, common_1.Get)('orders/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CancelOrderDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "cancelOrder", null);
__decorate([
    (0, common_1.Post)('confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ConfirmPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "test", null);
__decorate([
    (0, common_1.Get)('products/store/:storeId'),
    __param(0, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getProductsByStore", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map