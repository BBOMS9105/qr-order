import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsUUID, ValidateNested, Min, IsDefined, IsString } from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsDefined()
  orderItems: OrderItemDto[];
} 