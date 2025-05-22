import { User } from '../../users/entities/user.entity';
import { Store } from './store.entity';
import { OrderItem } from './order-item.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  OneToMany,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING', // 주문 생성됨 (결제 대기)
  PAID = 'PAID', // 결제 완료
  FAILED = 'FAILED', // 결제 실패
  CANCELED = 'CANCELED', // 주문/결제 취소됨
  PARTIAL_CANCELED = 'PARTIAL_CANCELED', // 부분 취소됨
  REFUNDED = 'REFUNDED', // 환불 완료
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') // 내부적으로 사용할 PK
  id: string;

  @Index({ unique: true })
  @Column() // 토스페이먼츠에서 사용하는 주문 ID (필수)
  orderId: string; // 예: "aoJYZGXAmgLzN92d3Kj6A"

  @Column({ nullable: true }) // 주문명, 프론트에서 받은 값 저장
  orderName?: string;

  @Column({ nullable: true }) // 결제 완료 후 채워짐
  paymentKey?: string;

  @Column()
  amount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ManyToOne(() => User, (user) => user.id, { eager: false, nullable: true })
  user?: User;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => Store, (store) => store.orders, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column({ type: 'uuid' })
  storeId: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  orderItems: OrderItem[];

  @Column({ type: 'timestamp', nullable: true }) // 결제 승인 시간
  approvedAt?: Date;

  @Column({ nullable: true }) // 카드, 가상계좌 등
  method?: string;

  @Column({ nullable: true })
  transactionId?: string; // 토스페이먼츠 거래 ID

  @Column({ type: 'text', nullable: true })
  receiptUrl?: string; // 영수증 URL

  @Column({ type: 'text', nullable: true }) // 실패 시 에러 메시지 등
  failReason?: string;

  @Column({ type: 'jsonb', nullable: true }) // 기타 필요한 결제 정보 (토스 응답 등)
  paymentDetails?: any;

  @CreateDateColumn() // 주문(결제 요청) 생성 시간
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
