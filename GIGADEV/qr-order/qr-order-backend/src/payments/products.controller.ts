/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UnauthorizedException,
  Req,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, IsInt, IsIn, IsBoolean } from 'class-validator';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';

// DTO for creating and updating products
export class ProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsInt()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    console.log('[Transformer Debug] Received value for isAvailable - type:', typeof value, ', value:', value);
    if (value === 'true' || value === true || value === '1') return true;
    if (value === 'false' || value === false || value === '0') return false;
    console.log('[Transformer Debug] Value not transformed to boolean, returning original:', value);
    return undefined;
  })
  isAvailable?: boolean;
}

// DTO for query parameters
export class GetProductsQueryDto {
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  searchTerm?: string;
}

// Interface for request with user info
interface RequestWithUser extends Request {
  user: {
    id: string;
    storeId?: string;
    [key: string]: any;
  };
}

@Controller('shop/manage')
@UseGuards(JwtAuthGuard) // 모든 엔드포인트에 JWT 인증 적용
export class ProductsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // 스토어 ID에 대한 권한 확인 헬퍼 메소드
  private validateStoreAccess(req: RequestWithUser, storeId: string) {
    const userStoreId = req.user.storeId;
    
    if (!userStoreId) {
      throw new UnauthorizedException('User is not associated with any store');
    }
    
    if (userStoreId !== storeId) {
      throw new UnauthorizedException('User does not have access to this store');
    }
    
    return true;
  }

  // 상품 목록 조회
  @Get(':storeId/products')
  async getProducts(
    @Param('storeId') storeId: string,
    @Req() req: RequestWithUser,
    @Query(new ValidationPipe({ transform: true, skipMissingProperties: true })) query: GetProductsQueryDto,
  ) {
    // 스토어 접근 권한 확인
    this.validateStoreAccess(req, storeId);
    
    return this.paymentsService.getProductsByStore(storeId, query.sortBy, query.order, query.searchTerm);
  }

  // 상품 상세 조회
  @Get(':storeId/products/:productId')
  async getProduct(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Req() req: RequestWithUser,
  ) {
    // 스토어 접근 권한 확인
    this.validateStoreAccess(req, storeId);
    
    const product = await this.paymentsService.getProductById(productId, storeId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    return product;
  }

  // 상품 생성
  @Post(':storeId/products')
  @UseInterceptors(FileInterceptor('image'))
  async createProduct(
    @Param('storeId') storeId: string,
    @Body(new ValidationPipe()) productDto: ProductDto,
    @Req() req: RequestWithUser,
    @UploadedFile() imageFile?: any,
  ) {
    // 스토어 접근 권한 확인
    this.validateStoreAccess(req, storeId);
    
    // DTO에서 storeId 값이 URL의 storeId와 일치하는지 확인
    if (productDto.storeId !== storeId) {
      throw new UnauthorizedException('Store ID mismatch');
    }
    
    return this.paymentsService.createProduct(productDto, imageFile);
  }

  // 상품 수정
  @Put(':storeId/products/:productId')
  @UseInterceptors(FileInterceptor('image'))
  async updateProduct(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body(new ValidationPipe({ transform: true })) productDto: ProductDto,
    @Req() req: RequestWithUser,
    @UploadedFile() imageFile?: any,
  ) {
    console.log('[Controller Debug] Request Content-Type:', req.headers['content-type']);
    console.log('[Controller Debug] Received productDto:', JSON.stringify(productDto, null, 2));
    console.log('[Controller Debug] isAvailable value:', productDto.isAvailable);
    
    // 스토어 접근 권한 확인
    this.validateStoreAccess(req, storeId);
    
    // DTO에서 storeId 값이 URL의 storeId와 일치하는지 확인
    if (productDto.storeId !== storeId) {
      throw new UnauthorizedException('Store ID mismatch');
    }
    
    // 상품이 해당 스토어에 존재하는지 확인
    const existingProduct = await this.paymentsService.getProductById(productId, storeId);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    return this.paymentsService.updateProduct(productId, productDto, imageFile);
  }

  // 상품 삭제
  @Delete(':storeId/products/:productId')
  async deleteProduct(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Req() req: RequestWithUser,
  ) {
    // 스토어 접근 권한 확인
    this.validateStoreAccess(req, storeId);
    
    // 상품이 해당 스토어에 존재하는지 확인
    const existingProduct = await this.paymentsService.getProductById(productId, storeId);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    await this.paymentsService.deleteProduct(productId, storeId);
    return { success: true, message: 'Product deleted successfully' };
  }
} 