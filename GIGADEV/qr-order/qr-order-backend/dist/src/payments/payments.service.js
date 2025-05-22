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
exports.PaymentsService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("./entities/order.entity");
const rxjs_1 = require("rxjs");
const product_entity_1 = require("./entities/product.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
let PaymentsService = class PaymentsService {
    constructor(orderRepository, productRepository, orderItemRepository, httpService, configService, dataSource) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.orderItemRepository = orderItemRepository;
        this.httpService = httpService;
        this.configService = configService;
        this.dataSource = dataSource;
    }
    async createInitialOrder(createOrderDto) {
        const { storeId, orderItems: orderItemsDto } = createOrderDto;
        if (!orderItemsDto || orderItemsDto.length === 0) {
            throw new common_1.BadRequestException('Order items cannot be empty.');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const productIds = orderItemsDto.map((item) => item.productId);
            const products = await this.productRepository.find({
                where: productIds.map((id) => ({ id, storeId })),
            });
            if (products.length !== productIds.length) {
                throw new common_1.NotFoundException('One or more products not found or not associated with the store');
            }
            const unavailableProducts = products.filter((p) => !p.isAvailable);
            if (unavailableProducts.length > 0) {
                throw new common_1.BadRequestException(`Following products are not available: ${unavailableProducts.map((p) => p.name).join(', ')}`);
            }
            const productsMap = new Map(products.map((p) => [p.id, p]));
            let totalAmount = 0;
            const createdOrderItems = [];
            const orderNameParts = [];
            for (const itemDto of orderItemsDto) {
                const product = productsMap.get(itemDto.productId);
                if (!product) {
                    throw new common_1.NotFoundException(`Product with ID ${itemDto.productId} not found in map. This should not happen.`);
                }
                const itemPrice = Number(product.price) * itemDto.quantity;
                totalAmount += itemPrice;
                orderNameParts.push(`${product.name} x ${itemDto.quantity}`);
                const orderItem = this.orderItemRepository.create({
                    productId: product.id,
                    quantity: itemDto.quantity,
                    priceAtOrder: Number(product.price),
                    product: product,
                });
                createdOrderItems.push(orderItem);
            }
            const finalOrderName = orderNameParts.join(', ') || '상품 주문';
            const uniqueOrderId = `order_${storeId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const orderRepo = queryRunner.manager.getRepository(order_entity_1.Order);
            const order = orderRepo.create({
                orderId: uniqueOrderId,
                amount: totalAmount,
                status: order_entity_1.OrderStatus.PENDING,
                storeId,
                orderName: finalOrderName,
                orderItems: createdOrderItems,
            });
            const savedOrder = await orderRepo.save(order);
            await queryRunner.commitTransaction();
            return savedOrder;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async confirmPayment(paymentKey, orderId, amount, storeId) {
        console.log(`[결제 확인] 주문 정보 조회 시작: orderId=${orderId}, storeId=${storeId}`);
        const order = await this.orderRepository.findOne({
            where: { orderId, storeId },
            relations: ['orderItems', 'orderItems.product']
        });
        if (!order) {
            console.error(`[결제 확인] 주문 ID ${orderId}를 찾을 수 없거나 해당 상점의 주문이 아닙니다.`);
            throw new common_1.NotFoundException(`Order with ID ${orderId} not found or does not belong to the store.`);
        }
        console.log(`[결제 확인] 주문 상태 확인: ${order.status}, 주문 금액: ${order.amount}, 요청 금액: ${amount}`);
        if (order.status !== order_entity_1.OrderStatus.PENDING) {
            if (order.status === order_entity_1.OrderStatus.PAID) {
                console.log(`[결제 확인] 이미 완료된 결제입니다: ${orderId}`);
                return {
                    success: true,
                    message: 'Payment already confirmed.',
                    order: {
                        orderId: order.orderId,
                        amount: order.amount,
                        status: order.status,
                        method: order.method,
                        approvedAt: order.approvedAt,
                        receiptUrl: order.receiptUrl,
                    },
                };
            }
            console.error(`[결제 확인] 유효하지 않은 주문 상태: ${order.status}`);
            throw new common_1.BadRequestException(`Order is not in a PENDING state. Current state: ${order.status}`);
        }
        if (order.amount !== amount) {
            console.error(`[결제 확인] 금액 불일치: 예상=${order.amount}, 실제=${amount}`);
            throw new common_1.BadRequestException(`Amount mismatch: expected ${order.amount}, but got ${amount}.`);
        }
        try {
            console.log(`[결제 확인] 토스페이먼츠 결제 승인 API 호출 준비 - paymentKey: ${paymentKey}`);
            const tossApiSecretKey = this.configService.getOrThrow('TOSS_SECRET_KEY');
            console.log(`[결제 확인] 시크릿 키 확인: ${tossApiSecretKey ? '설정됨' : '설정되지 않음'}`);
            const basicToken = Buffer.from(`${tossApiSecretKey}:`).toString('base64');
            const url = 'https://api.tosspayments.com/v1/payments/confirm';
            const headers = {
                Authorization: `Basic ${basicToken}`,
                'Content-Type': 'application/json',
            };
            const requestData = { paymentKey, orderId, amount };
            console.log(`[결제 확인] 토스페이먼츠 API 요청 데이터:`, JSON.stringify(requestData));
            console.log(`[결제 확인] 토스페이먼츠 API 요청 URL: ${url}`);
            console.log(`[결제 확인] 토스페이먼츠 API 요청 헤더:`, JSON.stringify({
                'Content-Type': headers['Content-Type'],
                'Authorization': 'Basic ****'
            }));
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, requestData, { headers }));
            console.log(`[결제 확인] 토스페이먼츠 API 응답 상태 코드: ${response.status}`);
            console.log(`[결제 확인] 토스페이먼츠 API 응답 데이터:`, JSON.stringify(response.data));
            const responseData = response.data;
            if (responseData && 'status' in responseData && responseData.status === 'DONE') {
                console.log(`[결제 확인] 토스페이먼츠 결제 성공: ${responseData.status}`);
                const queryRunner = this.dataSource.createQueryRunner();
                await queryRunner.connect();
                await queryRunner.startTransaction();
                try {
                    const orderRepo = queryRunner.manager.getRepository(order_entity_1.Order);
                    const successData = responseData;
                    order.status = order_entity_1.OrderStatus.PAID;
                    order.paymentKey = paymentKey;
                    order.approvedAt = successData.approvedAt
                        ? new Date(successData.approvedAt)
                        : new Date();
                    order.method = successData.method;
                    order.transactionId = successData.transactionId;
                    order.receiptUrl = successData.receipt?.url;
                    order.paymentDetails = successData;
                    await orderRepo.save(order);
                    console.log(`[결제 확인] 주문 상태 업데이트 완료: ${orderId} -> PAID`);
                    await queryRunner.commitTransaction();
                    console.log(`[결제 확인] 트랜잭션 커밋 완료`);
                    console.log(`[결제 확인 완료] 💰 결제가 성공적으로 완료되었습니다! 주문번호: ${orderId}`);
                    return {
                        success: true,
                        message: 'Payment confirmed successfully.',
                        order: {
                            orderId: order.orderId,
                            amount: order.amount,
                            status: order.status,
                            method: order.method,
                            approvedAt: order.approvedAt,
                            receiptUrl: order.receiptUrl,
                        },
                        orderData: {
                            orderId: order.orderId,
                            orderItems: order.orderItems.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                priceAtOrder: item.priceAtOrder,
                                name: item.product?.name || '상품',
                            })),
                        }
                    };
                }
                catch (err) {
                    await queryRunner.rollbackTransaction();
                    console.error(`[결제 확인] 주문 상태 업데이트 실패:`, err);
                    throw err;
                }
                finally {
                    await queryRunner.release();
                }
            }
            else {
                console.error(`[결제 확인] 토스페이먼츠 API 실패 응답:`, responseData);
                const failureData = responseData;
                const queryRunner = this.dataSource.createQueryRunner();
                await queryRunner.connect();
                await queryRunner.startTransaction();
                try {
                    const orderRepo = queryRunner.manager.getRepository(order_entity_1.Order);
                    order.status = order_entity_1.OrderStatus.FAILED;
                    order.failReason = failureData?.message ||
                        responseData?.status ||
                        'Toss API returned non-DONE status or unexpected format';
                    order.paymentDetails = responseData;
                    await orderRepo.save(order);
                    console.log(`[결제 확인] 주문 상태 업데이트 완료: ${orderId} -> FAILED (${order.failReason})`);
                    await queryRunner.commitTransaction();
                    throw new common_1.BadRequestException(order.failReason);
                }
                catch (err) {
                    await queryRunner.rollbackTransaction();
                    console.error(`[결제 확인] 주문 상태 업데이트 실패:`, err);
                    throw err;
                }
                finally {
                    await queryRunner.release();
                }
            }
        }
        catch (error) {
            console.error(`[결제 확인] 토스페이먼츠 API 호출 오류:`, error);
            const axiosError = error;
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();
            try {
                const orderRepo = queryRunner.manager.getRepository(order_entity_1.Order);
                order.status = order_entity_1.OrderStatus.FAILED;
                order.failReason = axiosError.response?.data?.message ||
                    axiosError.message ||
                    'Failed to call Toss API';
                if (axiosError.response?.data) {
                    order.paymentDetails = axiosError.response.data;
                }
                await orderRepo.save(order);
                console.log(`[결제 확인] 주문 상태 업데이트 완료: ${orderId} -> FAILED (API 호출 오류)`);
                await queryRunner.commitTransaction();
                console.error(`[결제 확인] 토스페이먼츠 API 오류:`, axiosError.response?.data || axiosError.message);
                throw new common_1.InternalServerErrorException(`Failed to confirm payment with Toss API: ${order.failReason}`);
            }
            catch (err) {
                await queryRunner.rollbackTransaction();
                console.error(`[결제 확인] 주문 상태 업데이트 실패:`, err);
                throw err;
            }
            finally {
                await queryRunner.release();
            }
        }
    }
    async getProductsByStore(storeId, sortBy, order, searchTerm) {
        const queryBuilder = this.productRepository.createQueryBuilder('product');
        queryBuilder.where('product.storeId = :storeId', { storeId });
        if (searchTerm) {
            queryBuilder.andWhere('(product.name LIKE :searchTerm OR product.description LIKE :searchTerm)', { searchTerm: `%${searchTerm}%` });
        }
        if (sortBy && order) {
            const allowedSortByFields = ['name', 'price', 'createdAt', 'updatedAt'];
            if (allowedSortByFields.includes(sortBy)) {
                queryBuilder.orderBy(`product.${sortBy}`, order);
            }
            else {
                queryBuilder.orderBy('product.createdAt', 'DESC');
            }
        }
        else {
            queryBuilder.orderBy('product.createdAt', 'DESC');
        }
        return queryBuilder.getMany();
    }
    async getProductById(productId, storeId) {
        return this.productRepository.findOne({ where: { id: productId, storeId } });
    }
    async createProduct(productDto, imageFile) {
        const { name, description, price, storeId, isAvailable } = productDto;
        if (imageFile) {
            console.log('Image file received in service:', imageFile.originalname);
        }
        const newProduct = this.productRepository.create({
            name,
            description,
            price,
            storeId,
            isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
        });
        return this.productRepository.save(newProduct);
    }
    async updateProduct(productId, productDto, imageFile) {
        const product = await this.productRepository.findOne({ where: { id: productId, storeId: productDto.storeId } });
        if (!product) {
            return null;
        }
        if (imageFile) {
            console.log('Image file received for update in service:', imageFile.originalname);
        }
        console.log('[Service Debug] productDto.isAvailable before processing:', productDto.isAvailable);
        product.name = productDto.name;
        product.description = productDto.description;
        product.price = productDto.price;
        if (typeof productDto.isAvailable === 'boolean') {
            product.isAvailable = productDto.isAvailable;
            console.log('[Service Debug] product.isAvailable after assignment:', product.isAvailable);
        }
        else {
            console.log('[Service Debug] productDto.isAvailable is NOT a boolean. Current product.isAvailable:', product.isAvailable);
        }
        return this.productRepository.save(product);
    }
    async deleteProduct(productId, storeId) {
        const product = await this.productRepository.findOne({ where: { id: productId, storeId } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${productId} not found in store ${storeId}`);
        }
        await this.productRepository.remove(product);
    }
    async getOrderById(orderId, storeId) {
        console.log(`주문 정보 조회: orderId=${orderId}, storeId=${storeId}`);
        try {
            const order = await this.orderRepository.findOne({
                where: { orderId, storeId },
                relations: ['orderItems', 'orderItems.product'],
            });
            if (!order) {
                throw new common_1.NotFoundException(`주문 ID ${orderId}를 찾을 수 없거나 해당 상점의 주문이 아닙니다.`);
            }
            const orderData = {
                orderId: order.orderId,
                amount: order.amount,
                status: order.status,
                storeId: order.storeId,
                orderName: order.orderName,
                method: order.method,
                approvedAt: order.approvedAt,
                receiptUrl: order.receiptUrl,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                orderItems: order.orderItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    priceAtOrder: item.priceAtOrder,
                    name: item.product?.name || '상품',
                })),
            };
            console.log(`주문 정보 조회 성공: ${JSON.stringify(orderData, null, 2)}`);
            return orderData;
        }
        catch (error) {
            console.error('주문 정보 조회 오류:', error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('주문 정보 조회 중 오류가 발생했습니다.');
        }
    }
    async cancelOrder(orderId, storeId, reason = '사용자에 의한 결제 취소') {
        console.log(`[주문 취소] 취소 처리 시작: orderId=${orderId}, storeId=${storeId}, reason=${reason}`);
        const order = await this.orderRepository.findOne({
            where: { orderId, storeId },
            relations: ['orderItems']
        });
        if (!order) {
            console.error(`[주문 취소] 주문 ID ${orderId}를 찾을 수 없거나 해당 상점의 주문이 아닙니다.`);
            throw new common_1.NotFoundException(`Order with ID ${orderId} not found or does not belong to the store.`);
        }
        console.log(`[주문 취소] 주문 상태 확인: ${order.status}`);
        if (order.status === order_entity_1.OrderStatus.CANCELED || order.status === order_entity_1.OrderStatus.FAILED) {
            console.log(`[주문 취소] 이미 취소되었거나 실패한 주문입니다: ${orderId}, 상태: ${order.status}`);
            return {
                success: true,
                message: '이미 취소되었거나 실패한 주문입니다.',
                order: {
                    orderId: order.orderId,
                    status: order.status,
                },
            };
        }
        if (order.status === order_entity_1.OrderStatus.PAID) {
            console.log(`[주문 취소] 이미 결제 완료된 주문입니다: ${orderId}`);
            return {
                success: false,
                message: '이미 결제 완료된 주문은 이 API를 통해 취소할 수 없습니다. 환불 API를 사용하세요.',
                order: {
                    orderId: order.orderId,
                    status: order.status,
                },
            };
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const orderRepo = queryRunner.manager.getRepository(order_entity_1.Order);
            order.status = order_entity_1.OrderStatus.CANCELED;
            order.failReason = reason;
            await orderRepo.save(order);
            console.log(`[주문 취소] 주문 상태 업데이트 완료: ${orderId} -> CANCELED`);
            await queryRunner.commitTransaction();
            console.log(`[주문 취소] 트랜잭션 커밋 완료`);
            return {
                success: true,
                message: '주문이 성공적으로 취소되었습니다.',
                order: {
                    orderId: order.orderId,
                    status: order.status,
                },
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(`[주문 취소] 주문 상태 업데이트 실패:`, error);
            throw new common_1.InternalServerErrorException(`Failed to cancel order: ${error.message}`);
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(2, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        axios_1.HttpService,
        config_1.ConfigService,
        typeorm_2.DataSource])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map