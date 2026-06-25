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

export enum VisitEventType {
  VISIT = 'VISIT',
  BLOCKED = 'BLOCKED',
  PLAN_VIEW = 'PLAN_VIEW',
  HOME_VIEW = 'HOME_VIEW',
  CONFIRM_VIEW = 'CONFIRM_VIEW',
  SUBSCRIBE_CLICK = 'SUBSCRIBE_CLICK',
  SUBSCRIBE_SUCCESS = 'SUBSCRIBE_SUCCESS',
  SUBSCRIBE_FAILED = 'SUBSCRIBE_FAILED',
}

@Entity('visit_events')
export class VisitEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'visit_id' })
  visitId: number;

  @ManyToOne(() => Visit, (visit) => visit.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visit_id' })
  visit: Visit;

  @Column({
    type: 'varchar',
    name: 'event_type',
  })
  eventType: VisitEventType;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
