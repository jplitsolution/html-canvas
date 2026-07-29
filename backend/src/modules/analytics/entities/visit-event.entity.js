import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Visit } from './visit.entity';

export const VisitEventType = {
  VISIT: 'VISIT',
  BLOCKED: 'BLOCKED',
  PLAN_VIEW: 'PLAN_VIEW',
  HOME_VIEW: 'HOME_VIEW',
  OTP_VIEW: 'OTP_VIEW',
  OTP_SEND: 'OTP_SEND',
  OTP_VERIFY: 'OTP_VERIFY',
  CONFIRM_VIEW: 'CONFIRM_VIEW',
  SUBSCRIBE_CLICK: 'SUBSCRIBE_CLICK',
  SUBSCRIBE_SUCCESS: 'SUBSCRIBE_SUCCESS',
  SUBSCRIBE_FAILED: 'SUBSCRIBE_FAILED',
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT',
  BLOCKED_REQUEST: 'BLOCKED_REQUEST',
};

@Entity('visit_events')
export class VisitEvent {
  @PrimaryGeneratedColumn()
  id;

  @Index()
  @Column({ name: 'visit_id' })
  visitId;

  @ManyToOne(() => Visit, (visit) => visit.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visit_id' })
  visit;

  @Column({
    type: 'varchar',
    name: 'event_type',
  })
  eventType;

  @Column({ type: 'json', nullable: true })
  metadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;
}
