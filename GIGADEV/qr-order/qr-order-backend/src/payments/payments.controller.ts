import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { IsNumber, IsString, IsUUID } from 'class-validator';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  InitiateOrderResponseDto,
  PaymentConfirmationResponseDto,
} from './interfaces/payment-response.interface';

export class ConfirmPaymentDto {
  @IsString()
  paymentKey: string;

  @IsString()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsString()
  storeId: string;
}

export class CancelOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  storeId: string;

  @IsString()
  reason?: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  async initiateOrder(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createOrderDto: CreateOrderDto,
  ): Promise<InitiateOrderResponseDto> {
    console.log('----------------------------------------');
    console.log('[주문 초기화 요청 수신]');
    console.log('시간:', new Date().toISOString());
    console.log('요청 데이터:', JSON.stringify(createOrderDto, null, 2));
    console.log('----------------------------------------');

    try {
      const order = await this.paymentsService.createInitialOrder(createOrderDto);
      
      const response: InitiateOrderResponseDto = {
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
    } catch (error) {
      console.error('[주문 초기화 오류]:', error);
      throw error;
    }
  }

  @Get('orders/:orderId')
  async getOrderById(
    @Param('orderId') orderId: string,
    @Query('storeId') storeId: string,
  ) {
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
    } catch (error) {
      console.error('[주문 정보 조회 오류]:', error);
      throw error;
    }
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Body(new ValidationPipe()) cancelOrderDto: CancelOrderDto,
  ) {
    console.log('----------------------------------------');
    console.log('[주문 취소 요청 수신]');
    console.log('시간:', new Date().toISOString());
    console.log('요청 데이터:', JSON.stringify(cancelOrderDto, null, 2));
    console.log('----------------------------------------');
    
    try {
      const result = await this.paymentsService.cancelOrder(
        cancelOrderDto.orderId,
        cancelOrderDto.storeId,
        cancelOrderDto.reason || '사용자에 의한 결제 취소',
      );
      
      console.log('[주문 취소 성공]:', JSON.stringify(result, null, 2));
      console.log('----------------------------------------');
      
      return result;
    } catch (error) {
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

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Body(new ValidationPipe()) confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<PaymentConfirmationResponseDto> {
    console.log('----------------------------------------');
    console.log('[결제 확인 요청 수신]');
    console.log('시간:', new Date().toISOString());
    console.log('요청 데이터:', JSON.stringify(confirmPaymentDto, null, 2));
    console.log('----------------------------------------');
    
    try {
      // 결제 확인 시도 전 로그
      console.log(`[결제 확인] 토스페이먼츠 결제 승인 시작 - paymentKey: ${confirmPaymentDto.paymentKey}, orderId: ${confirmPaymentDto.orderId}`);
      
      const result = await this.paymentsService.confirmPayment(
        confirmPaymentDto.paymentKey,
        confirmPaymentDto.orderId,
        confirmPaymentDto.amount,
        confirmPaymentDto.storeId,
      );
      
      // 결제 확인 성공 후 로그
      console.log('[결제 확인 성공]:', JSON.stringify(result, null, 2));
      console.log('----------------------------------------');
      
      return result;
    } catch (error) {
      // 실패 로그 상세화
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

  @Get('test')
  test() {
    console.log('테스트 엔드포인트 호출됨:', new Date().toISOString());
    return {
      success: true,
      message: '백엔드 연결 테스트 성공',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('products/store/:storeId')
  async getProductsByStore(@Param('storeId') storeId: string) {
    console.log('----------------------------------------');
    console.log('[스토어 상품 조회 요청 수신]');
    console.log('시간:', new Date().toISOString());
    console.log('스토어 ID:', storeId);
    console.log('----------------------------------------');
    
    try {
      const products = await this.paymentsService.getProductsByStore(storeId);
      console.log(`[스토어 상품 조회 성공] ${products.length}개 상품 반환`);
      return products;
    } catch (error) {
      console.error('[스토어 상품 조회 오류]:', error);
      throw error;
    }
  }
}
