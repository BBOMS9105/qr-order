import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Product } from './entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { AuthModule } from '../auth/auth.module';
import { Store } from './entities/store.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, OrderItem, Store]),
    HttpModule,
    ConfigModule,
    AuthModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController, ProductsController],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
