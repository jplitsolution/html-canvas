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

export enum VisitStatus {
  VISIT = 'VISIT',
  BLOCKED = 'BLOCKED',
  SUBSCRIBED = 'SUBSCRIBED',
  PLAN_SHOWN = 'PLAN_SHOWN',
  HOME_SHOWN = 'HOME_SHOWN',
  OTP_SHOWN = 'OTP_SHOWN',
  CONFIRM_SHOWN = 'CONFIRM_SHOWN',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'campaign_id', nullable: true })
  campaignId?: number;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  operator?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ name: 'landing_url', type: 'text', nullable: true })
  landingUrl?: string;

  @Column({
    type: 'varchar',
    name: 'visit_status',
    default: VisitStatus.VISIT,
  })
  visitStatus: VisitStatus;

  @Column({ name: 'page_type', nullable: true })
  pageType?: string;

  @OneToMany(() => VisitEvent, (event) => event.visit)
  events: VisitEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
