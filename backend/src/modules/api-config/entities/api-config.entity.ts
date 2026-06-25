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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
