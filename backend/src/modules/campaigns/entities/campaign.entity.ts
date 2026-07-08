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

@Entity('campaigns')
@Index(['country', 'operator'], { unique: true })
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  country: string;

  @Column()
  operator: string;

  @Column({ name: 'service_id', nullable: true })
  serviceId?: string;

  @Column({ default: false })
  active: boolean;

  @Column({ name: 'user_id' })
  userId: number;

  /** Optional vendor assigned to this campaign (drives affiliate tracking links). */
  @Column({ name: 'vendor_id', nullable: true })
  vendorId?: number;

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
}
