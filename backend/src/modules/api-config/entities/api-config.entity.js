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
  id;

  @Index({ unique: true })
  @Column({ name: 'campaign_id' })
  campaignId;

  @Column({ name: 'user_api', nullable: true })
  userApi;

  @Column({ name: 'blocklist_api', nullable: true })
  blocklistApi;

  @Column({ name: 'subscription_api', nullable: true })
  subscriptionApi;

  @Column({ name: 'subscribe_api', nullable: true })
  subscribeApi;

  @Column({ name: 'headers_json', type: 'text', nullable: true })
  headersJson;

  @Column({ name: 'otp_provider', type: 'varchar', length: 32, nullable: true })
  otpProvider;

  @Column({ name: 'otp_config_json', type: 'text', nullable: true })
  otpConfigJson;

  @Column({ name: 'resolve_msisdn_url', type: 'varchar', length: 1024, nullable: true })
  resolveMsisdnUrl;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
