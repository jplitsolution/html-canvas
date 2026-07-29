import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Affiliate } from './affiliate.entity';

@Entity('vendors')
@Index(['userId', 'code'], { unique: true })
export class Vendor {
  @PrimaryGeneratedColumn()
  id;

  @Column()
  name;

  @Column()
  code;

  @Column({ name: 'user_id' })
  userId;

  @Column({ default: true })
  active;

  @OneToMany(() => Affiliate, (affiliate) => affiliate.vendor)
  affiliates;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
