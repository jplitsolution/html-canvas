import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'otp_requests' })
@Index('IDX_OTP_PHONE_CREATED', ['phone', 'createdAt'])
export class OtpRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'visit_id', type: 'int', nullable: true })
  visitId?: number | null;

  @Column({ name: 'campaign_id', type: 'int', nullable: true })
  campaignId?: number | null;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ name: 'otp_hash', type: 'varchar', length: 255 })
  otpHash: string;

  @Column({ name: 'otp_salt', type: 'varchar', length: 64, nullable: true })
  otpSalt?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  provider?: string | null;

  @Column({ name: 'provider_request_id', type: 'varchar', length: 255, nullable: true })
  providerRequestId?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
