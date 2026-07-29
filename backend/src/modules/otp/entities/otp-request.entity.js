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
  id;

  @Column({ name: 'visit_id', type: 'int', nullable: true })
  visitId;

  @Column({ name: 'campaign_id', type: 'int', nullable: true })
  campaignId;

  @Column({ type: 'varchar', length: 32 })
  phone;

  @Column({ name: 'otp_hash', type: 'varchar', length: 255 })
  otpHash;

  @Column({ name: 'otp_salt', type: 'varchar', length: 64, nullable: true })
  otpSalt;

  @Column({ type: 'varchar', length: 32, nullable: true })
  provider;

  @Column({ name: 'provider_request_id', type: 'varchar', length: 255, nullable: true })
  providerRequestId;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status;

  @Column({ type: 'int', default: 0 })
  attempts;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt;
}
