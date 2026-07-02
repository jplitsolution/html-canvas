import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'otp_requests' })
@Index('IDX_OTP_PHONE_CREATED', ['phone', 'createdAt'])
export class OtpRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ name: 'otp_hash', type: 'varchar', length: 255 })
  otpHash: string;

  @Column({ name: 'otp_salt', type: 'varchar', length: 64 })
  otpSalt: string;

  @Column({ name: 'visit_id', type: 'varchar', length: 64, nullable: true })
  visitId?: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

