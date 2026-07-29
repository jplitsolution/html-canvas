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
  id;

  @Index()
  @Column({ name: 'vendor_id' })
  vendorId;

  @ManyToOne(() => Vendor, (vendor) => vendor.affiliates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'vendor_id' })
  vendor;

  @Column()
  name;

  @Column()
  code;

  @Column({ name: 'user_id' })
  userId;

  @Column({ default: true })
  active;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
