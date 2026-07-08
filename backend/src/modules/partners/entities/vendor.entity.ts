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
  id: number;

  @Column()
  name: string;

  /** Short code used as the `vid` tracking-URL parameter. */
  @Column()
  code: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Affiliate, (affiliate) => affiliate.vendor)
  affiliates: Affiliate[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
