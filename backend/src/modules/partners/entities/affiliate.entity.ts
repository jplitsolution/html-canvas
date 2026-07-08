import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('affiliates')
@Index(['userId', 'code'], { unique: true })
export class Affiliate {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'vendor_id' })
  vendorId: number;

  @ManyToOne(() => Vendor, (vendor) => vendor.affiliates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column()
  name: string;

  /** Short code used as the `aff_id` tracking-URL parameter. */
  @Column()
  code: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
