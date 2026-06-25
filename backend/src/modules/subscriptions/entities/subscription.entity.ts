import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

@Entity('subscriptions')
@Index(['phone', 'serviceId'])
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({
    type: 'varchar',
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
