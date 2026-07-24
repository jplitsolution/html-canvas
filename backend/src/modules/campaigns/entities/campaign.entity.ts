import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignPage } from './campaign-page.entity';
import { CampaignTracking } from './campaign-tracking.entity';
import { Operator } from '../../markets/entities/operator.entity';

@Entity('campaigns')
@Index(['operatorId', 'name'], { unique: true })
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /** Denormalized display name (kept for public URLs / templates). */
  @Column()
  country: string;

  /** Denormalized display name (kept for public URLs / templates). */
  @Column()
  operator: string;

  @Column({ name: 'operator_id', nullable: true })
  operatorId?: number;

  @ManyToOne(() => Operator, (op) => op.campaigns, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'operator_id' })
  marketOperator?: Operator;

  @Column({ name: 'service_id', nullable: true })
  serviceId?: string;

  @Column({ default: false })
  active: boolean;

  @Column({ name: 'user_id' })
  userId: number;

  /** Explicit table for tracking Vendor & Affiliate assignments. */
  @OneToMany(() => CampaignTracking, (tracking) => tracking.campaign, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  trackings: CampaignTracking[];

  /** Per-campaign verification policy: MSISDN_ONLY | OTP_ONLY | BOTH (null = legacy). */
  @Column({ name: 'verification_mode', type: 'varchar', length: 16, nullable: true })
  verificationMode?: string;

  /** JSON-encoded page-flow graph (null = legacy hardcoded flow). */
  @Column({ name: 'flow_config', type: 'text', nullable: true })
  flowConfig?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CampaignPage, (page) => page.campaign)
  pages: CampaignPage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Computed composite tracking id (not a DB column). */
  trackingId?: string;
}
