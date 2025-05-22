/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity'; // Store 엔티티 경로

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('int') // 가격, 정수 타입으로 변경
  price: number;

  @Column({ nullable: true }) // 이미지 URL
  image?: string;

  @Column({ default: true }) // 판매 가능 여부
  isAvailable: boolean;

  @ManyToOne(() => Store, (store) => store.products, { nullable: false }) // Product는 반드시 Store에 속함
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column({ type: 'uuid' })
  storeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 