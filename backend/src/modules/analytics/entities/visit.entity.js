import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { VisitEvent } from './visit-event.entity';

export const VisitStatus = {
  VISIT: 'VISIT',
  BLOCKED: 'BLOCKED',
  SUBSCRIBED: 'SUBSCRIBED',
  PLAN_SHOWN: 'PLAN_SHOWN',
  HOME_SHOWN: 'HOME_SHOWN',
  OTP_SHOWN: 'OTP_SHOWN',
  CONFIRM_SHOWN: 'CONFIRM_SHOWN',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn()
  id;

  @Index()
  @Column({ name: 'campaign_id', nullable: true })
  campaignId;

  @Column({ nullable: true })
  phone;

  @Column({ nullable: true })
  country;

  @Column({ nullable: true })
  operator;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress;

  @Column({ name: 'user_agent', nullable: true })
  userAgent;

  @Column({ name: 'landing_url', type: 'text', nullable: true })
  landingUrl;

  @Index()
  @Column({ name: 'vendor_id', nullable: true })
  vendorId;

  @Index()
  @Column({ name: 'affiliate_id', nullable: true })
  affiliateId;

  @Index()
  @Column({ name: 'click_id', nullable: true })
  clickId;

  @Column({ name: 'vid_raw', nullable: true })
  vidRaw;

  @Column({ name: 'aff_raw', nullable: true })
  affRaw;

  @Column({
    type: 'varchar',
    name: 'visit_status',
    default: VisitStatus.VISIT,
  })
  visitStatus;

  @Column({ name: 'page_type', nullable: true })
  pageType;

  @OneToMany(() => VisitEvent, (event) => event.visit)
  events;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
