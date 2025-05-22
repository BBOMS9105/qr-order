import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '../../payments/entities/store.entity';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  businessRegistrationNumber?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', length: 255 })
  salt!: string;

  @Column({ type: 'int', nullable: true })
  usageMonths?: number;

  @Column({ type: 'boolean', default: true, nullable: true })
  isActive?: boolean;

  @Column({ type: 'varchar', nullable: true })
  refreshToken?: string | null;

  @ManyToOne(() => Store, (store) => store.users, { nullable: true, eager: true })
  @JoinColumn({ name: 'storeId' })
  store?: Store;

  @Column({ type: 'uuid', nullable: true })
  storeId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
