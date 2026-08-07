import { EntitySchema } from 'typeorm';

export class VisitEvent {}

export const VisitEventType = {
  VISIT: 'VISIT',
  BLOCKED: 'BLOCKED',
  HOME_VIEW: 'HOME_VIEW',
  OTP_VIEW: 'OTP_VIEW',
  OTP_SEND: 'OTP_SEND',
  OTP_VERIFY: 'OTP_VERIFY',
  CONFIRM_VIEW: 'CONFIRM_VIEW',
  SUBSCRIBE_CLICK: 'SUBSCRIBE_CLICK',
  SUBSCRIBE_SUCCESS: 'SUBSCRIBE_SUCCESS',
  SUBSCRIBE_FAILED: 'SUBSCRIBE_FAILED',
  CONFIRM_CLICK: 'CONFIRM_CLICK',
  POSTBACK_PENDING: 'POSTBACK_PENDING',
  POSTBACK_SENT: 'POSTBACK_SENT',
  POSTBACK_FAILED: 'POSTBACK_FAILED',
  CALLBACK_RECEIVED: 'CALLBACK_RECEIVED',
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT',
  BLOCKED_REQUEST: 'BLOCKED_REQUEST',
};

export const VisitEventSchema = new EntitySchema({
  name: 'VisitEvent',
  target: VisitEvent,
  tableName: 'visit_events',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    visitId: {
      name: 'visit_id',
      type: 'int',
    },
    eventType: {
      name: 'event_type',
      type: 'varchar',
    },
    metadata: {
      type: 'json',
      nullable: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    visit: {
      type: 'many-to-one',
      target: 'Visit',
      inverseSide: 'events',
      joinColumn: { name: 'visit_id' },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    { name: 'IDX_VISIT_EVENT_VISIT_ID', columns: ['visitId'] },
  ],
});
