/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { firstValueFrom } from 'rxjs';
import {
  TossPaymentSuccessResponse,
  TossPaymentFailureResponse,
  TossApiResponse,
} from './interfaces/toss-payment.interface';
import type { AxiosError } from 'axios';
import { Product } from './entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentConfirmationResponseDto } from './interfaces/payment-response.interface';
import { ProductDto } from './products.controller';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async createInitialOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { storeId, orderItems: orderItemsDto } = createOrderDto;

    if (!orderItemsDto || orderItemsDto.length === 0) {
      throw new BadRequestException('Order items cannot be empty.');
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
        throw new NotFoundException(
          'One or more products not found or not associated with the store',
        );
      }

      const unavailableProducts = products.filter((p) => !p.isAvailable);
      if (unavailableProducts.length > 0) {
        throw new BadRequestException(
          `Following products are not available: ${unavailableProducts.map((p) => p.name).join(', ')}`,
        );
      }

      const productsMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      const createdOrderItems: OrderItem[] = [];
      const orderNameParts: string[] = [];

      for (const itemDto of orderItemsDto) {
        const product = productsMap.get(itemDto.productId);
        
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${itemDto.productId} not found in map. This should not happen.`
          );
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

      const orderRepo = queryRunner.manager.getRepository(Order);
      const order = orderRepo.create({
        orderId: uniqueOrderId,
        amount: totalAmount,
        status: OrderStatus.PENDING,
        storeId,
        orderName: finalOrderName,
        orderItems: createdOrderItems,
      });
      
      const savedOrder = await orderRepo.save(order);
      
      await queryRunner.commitTransaction();
      
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
    storeId: string,
  ): Promise<PaymentConfirmationResponseDto> {
    // 1. 주문 정보 조회
    console.log(`[결제 확인] 주문 정보 조회 시작: orderId=${orderId}, storeId=${storeId}`);
    
    const order = await this.orderRepository.findOne({ 
      where: { orderId, storeId },
      relations: ['orderItems', 'orderItems.product']
    });

    if (!order) {
      console.error(`[결제 확인] 주문 ID ${orderId}를 찾을 수 없거나 해당 상점의 주문이 아닙니다.`);
      throw new NotFoundException(
        `Order with ID ${orderId} not found or does not belong to the store.`,
      );
    }

    // 2. 주문 상태 확인
    console.log(`[결제 확인] 주문 상태 확인: ${order.status}, 주문 금액: ${order.amount}, 요청 금액: ${amount}`);
    
    if (order.status !== OrderStatus.PENDING) {
      if (order.status === OrderStatus.PAID) {
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
      throw new BadRequestException(
        `Order is not in a PENDING state. Current state: ${order.status}`,
      );
    }

    // 3. 금액 확인
    if (order.amount !== amount) {
      console.error(`[결제 확인] 금액 불일치: 예상=${order.amount}, 실제=${amount}`);
      throw new BadRequestException(
        `Amount mismatch: expected ${order.amount}, but got ${amount}.`,
      );
    }

    // 4. 토스페이먼츠 API 호출 준비
    try {
      console.log(`[결제 확인] 토스페이먼츠 결제 승인 API 호출 준비 - paymentKey: ${paymentKey}`);
      
      const tossApiSecretKey = this.configService.getOrThrow<string>('TOSS_SECRET_KEY');
      console.log(`[결제 확인] 시크릿 키 확인: ${tossApiSecretKey ? '설정됨' : '설정되지 않음'}`);
      
      const basicToken = Buffer.from(`${tossApiSecretKey}:`).toString('base64');
      const url = 'https://api.tosspayments.com/v1/payments/confirm';
      const headers = { 
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json',
      };
      const requestData = { paymentKey, orderId, amount };

      // 5. 토스페이먼츠 API 호출
      console.log(`[결제 확인] 토스페이먼츠 API 요청 데이터:`, JSON.stringify(requestData));
      console.log(`[결제 확인] 토스페이먼츠 API 요청 URL: ${url}`);
      console.log(`[결제 확인] 토스페이먼츠 API 요청 헤더:`, JSON.stringify({
        'Content-Type': headers['Content-Type'],
        'Authorization': 'Basic ****' // 실제 토큰은 로그에 표시하지 않음
      }));
      
      const response = await firstValueFrom(
        this.httpService.post<TossApiResponse>(url, requestData, { headers }),
      );
      
      console.log(`[결제 확인] 토스페이먼츠 API 응답 상태 코드: ${response.status}`);
      console.log(`[결제 확인] 토스페이먼츠 API 응답 데이터:`, JSON.stringify(response.data));
      
      const responseData = response.data;
      
      // 6. 응답 처리
      if (responseData && 'status' in responseData && responseData.status === 'DONE') {
        console.log(`[결제 확인] 토스페이먼츠 결제 성공: ${responseData.status}`);
        
        // 트랜잭션 시작
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const orderRepo = queryRunner.manager.getRepository(Order);
          const successData = responseData as TossPaymentSuccessResponse;
          
          // 주문 상태 업데이트
          order.status = OrderStatus.PAID;
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
        } catch (err) {
          await queryRunner.rollbackTransaction();
          console.error(`[결제 확인] 주문 상태 업데이트 실패:`, err);
          throw err;
        } finally {
          await queryRunner.release();
        }
      } else {
        // 실패 응답 처리
        console.error(`[결제 확인] 토스페이먼츠 API 실패 응답:`, responseData);
        
        const failureData = responseData as TossPaymentFailureResponse;
        
        // 트랜잭션 시작
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
          const orderRepo = queryRunner.manager.getRepository(Order);
          
          // 주문 상태 업데이트 - 실패
          order.status = OrderStatus.FAILED;
          order.failReason = failureData?.message || 
            (responseData as any)?.status || 
            'Toss API returned non-DONE status or unexpected format';
          order.paymentDetails = responseData;
          
          await orderRepo.save(order);
          console.log(`[결제 확인] 주문 상태 업데이트 완료: ${orderId} -> FAILED (${order.failReason})`);
          
          await queryRunner.commitTransaction();
          
          throw new BadRequestException(order.failReason);
        } catch (err) {
          await queryRunner.rollbackTransaction();
          console.error(`[결제 확인] 주문 상태 업데이트 실패:`, err);
          throw err;
        } finally {
          await queryRunner.release();
        }
      }
    } catch (error) {
      // API 호출 자체 오류 (네트워크 등)
      console.error(`[결제 확인] 토스페이먼츠 API 호출 오류:`, error);
      
      const axiosError = error as AxiosError<TossPaymentFailureResponse>;
      
      // 트랜잭션 시작
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        const orderRepo = queryRunner.manager.getRepository(Order);
        
        // 주문 상태 업데이트 - 실패
        order.status = OrderStatus.FAILED;
        order.failReason = axiosError.response?.data?.message || 
          axiosError.message || 
          'Failed to call Toss API';
          
        if (axiosError.response?.data) {
          order.paymentDetails = axiosError.response.data;
        }
        
        await orderRepo.save(order);
        console.log(`[결제 확인] 주문 상태 업데이트 완료: ${orderId} -> FAILED (API 호출 오류)`);
        
        await queryRunner.commitTransaction();
        
        console.error(`[결제 확인] 토스페이먼츠 API 오류:`, 
          axiosError.response?.data || axiosError.message,
        );
        
        throw new InternalServerErrorException(
          `Failed to confirm payment with Toss API: ${order.failReason}`,
        );
      } catch (err) {
        await queryRunner.rollbackTransaction();
        console.error(`[결제 확인] 주문 상태 업데이트 실패:`, err);
        throw err;
      } finally {
        await queryRunner.release();
      }
    }
  }

  async getProductsByStore(
    storeId: string,
    sortBy?: string,
    order?: 'ASC' | 'DESC',
    searchTerm?: string,
  ): Promise<Product[]> {
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    queryBuilder.where('product.storeId = :storeId', { storeId });

    if (searchTerm) {
      queryBuilder.andWhere(
        '(product.name LIKE :searchTerm OR product.description LIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (sortBy && order) {
      // 허용된 필드만 정렬에 사용하도록 제한 (선택 사항)
      const allowedSortByFields = ['name', 'price', 'createdAt', 'updatedAt']; 
      if (allowedSortByFields.includes(sortBy)) {
        queryBuilder.orderBy(`product.${sortBy}`, order);
      } else {
        // 기본 정렬 또는 오류 처리
        queryBuilder.orderBy('product.createdAt', 'DESC');
      }
    } else {
      // 기본 정렬
      queryBuilder.orderBy('product.createdAt', 'DESC');
    }

    return queryBuilder.getMany();
  }

  async getProductById(productId: string, storeId: string): Promise<Product | null> {
    return this.productRepository.findOne({ where: { id: productId, storeId } });
  }

  async createProduct(productDto: ProductDto, imageFile?: any): Promise<Product> {
    const { name, description, price, storeId, isAvailable } = productDto;
    if (imageFile) {
      console.log('Image file received in service:', imageFile.originalname);
      // S3 업로드 로직 (미구현)
      // productDto.image = s3Url; // DTO의 image 필드에 URL 할당 (만약 DTO를 직접 수정한다면)
    }
    const newProduct = this.productRepository.create({
      name,
      description,
      price,
      storeId,
      isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
      // image: productDto.image, // DB에 저장될 이미지 URL (S3 연동 후)
    });
    return this.productRepository.save(newProduct);
  }

  async updateProduct(productId: string, productDto: ProductDto, imageFile?: any): Promise<Product | null> {
    const product = await this.productRepository.findOne({ where: { id: productId, storeId: productDto.storeId } });
    if (!product) {
      return null;
    }
    if (imageFile) {
      console.log('Image file received for update in service:', imageFile.originalname);
      // S3 업로드 로직 (미구현)
      // productDto.image = s3Url; 
      // 기존 이미지 S3에서 삭제 로직 (미구현)
    }
    
    console.log('[Service Debug] productDto.isAvailable before processing:', productDto.isAvailable); // 서비스 레이어에서 받은 isAvailable 값 확인

    product.name = productDto.name;
    product.description = productDto.description;
    product.price = productDto.price;
    
    // isAvailable 업데이트 로직 추가
    if (typeof productDto.isAvailable === 'boolean') {
      product.isAvailable = productDto.isAvailable;
      console.log('[Service Debug] product.isAvailable after assignment:', product.isAvailable); // 할당 후 product.isAvailable 값 확인
    } else {
      console.log('[Service Debug] productDto.isAvailable is NOT a boolean. Current product.isAvailable:', product.isAvailable); // boolean이 아닐 경우 로그
    }
    // product.image = productDto.image; // S3 연동 후

    return this.productRepository.save(product);
  }

  async deleteProduct(productId: string, storeId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id: productId, storeId }});
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found in store ${storeId}`);
    }
    // S3 이미지 삭제 로직 (미구현)
    await this.productRepository.remove(product);
  }

  async getOrderById(orderId: string, storeId: string) {
    console.log(`주문 정보 조회: orderId=${orderId}, storeId=${storeId}`);
    try {
      // 주문 정보 조회 (주문 항목 포함)
      const order = await this.orderRepository.findOne({
        where: { orderId, storeId },
        relations: ['orderItems', 'orderItems.product'],
      });

      if (!order) {
        throw new NotFoundException(`주문 ID ${orderId}를 찾을 수 없거나 해당 상점의 주문이 아닙니다.`);
      }

      // 클라이언트에 반환할 데이터 구성
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
    } catch (error) {
      console.error('주문 정보 조회 오류:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('주문 정보 조회 중 오류가 발생했습니다.');
    }
  }

  async cancelOrder(
    orderId: string,
    storeId: string,
    reason: string = '사용자에 의한 결제 취소'
  ) {
    console.log(`[주문 취소] 취소 처리 시작: orderId=${orderId}, storeId=${storeId}, reason=${reason}`);
    
    // 1. 주문 정보 조회
    const order = await this.orderRepository.findOne({ 
      where: { orderId, storeId },
      relations: ['orderItems']
    });

    if (!order) {
      console.error(`[주문 취소] 주문 ID ${orderId}를 찾을 수 없거나 해당 상점의 주문이 아닙니다.`);
      throw new NotFoundException(
        `Order with ID ${orderId} not found or does not belong to the store.`,
      );
    }

    // 2. 주문 상태 확인
    console.log(`[주문 취소] 주문 상태 확인: ${order.status}`);
    
    // 이미 취소되었거나 실패한 주문인 경우
    if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.FAILED) {
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
    
    // 이미 결제 완료된 주문인 경우 - 실제로는 토스페이먼츠 API를 통한 결제 취소 로직이 필요
    if (order.status === OrderStatus.PAID) {
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

    // 3. 트랜잭션 처리 - PENDING 상태의 주문을 CANCELED로 변경
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const orderRepo = queryRunner.manager.getRepository(Order);
      
      // 주문 상태 업데이트
      order.status = OrderStatus.CANCELED;
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`[주문 취소] 주문 상태 업데이트 실패:`, error);
      throw new InternalServerErrorException(
        `Failed to cancel order: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
