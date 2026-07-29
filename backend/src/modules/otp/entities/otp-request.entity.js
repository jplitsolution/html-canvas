import { EntitySchema } from 'typeorm';

export class OtpRequest {}

export const OtpRequestSchema = new EntitySchema({
  name: 'OtpRequest',
  target: OtpRequest,
  tableName: 'otp_requests',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    visitId: {
      name: 'visit_id',
      type: 'int',
      nullable: true,
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      nullable: true,
    },
    phone: {
      type: 'varchar',
      length: 32,
    },
    otpCode: {
      name: 'otp_code',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    otpHash: {
      name: 'otp_hash',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    otpSalt: {
      name: 'otp_salt',
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    provider: {
      type: 'varchar',
      length: 32,
      nullable: true,
    },
    providerRequestId: {
      name: 'provider_request_id',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    status: {
      type: 'varchar',
      length: 32,
      default: 'pending',
    },
    attempts: {
      type: 'int',
      default: 0,
    },
    usedAt: {
      name: 'used_at',
      type: 'timestamp',
      nullable: true,
    },
    verifiedAt: {
      name: 'verified_at',
      type: 'timestamp',
      nullable: true,
    },
    expiresAt: {
      name: 'expires_at',
      type: 'timestamp',
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
  },
  indices: [
    {
      name: 'IDX_OTP_PHONE_CREATED',
      columns: ['phone', 'createdAt'],
    },
  ],
});
