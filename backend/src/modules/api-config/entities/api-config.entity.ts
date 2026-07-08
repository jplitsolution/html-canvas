import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_configs')
export class ApiConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'campaign_id' })
  campaignId: number;

  @Column({ name: 'user_api', nullable: true })
  userApi?: string;

  @Column({ name: 'blocklist_api', nullable: true })
  blocklistApi?: string;

  @Column({ name: 'subscription_api', nullable: true })
  subscriptionApi?: string;

  @Column({ name: 'subscribe_api', nullable: true })
  subscribeApi?: string;

  @Column({ name: 'headers_json', type: 'text', nullable: true })
  headersJson?: string;

  @Column({ name: 'otp_provider', type: 'varchar', length: 32, nullable: true })
  otpProvider?: string;

  @Column({ name: 'otp_config_json', type: 'text', nullable: true })
  otpConfigJson?: string;

  /** ISP/partner API URL template to resolve an MSISDN (supports {{msisdn}}). */
  @Column({ name: 'resolve_msisdn_url', type: 'varchar', length: 1024, nullable: true })
  resolveMsisdnUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
