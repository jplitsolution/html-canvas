import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { OtpRequest } from './entities/otp-request.entity';

@Injectable()
export class OtpService {
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxAttempts = 5;

  constructor(
    @InjectRepository(OtpRequest)
    private readonly otpRepository: Repository<OtpRequest>,
  ) {}

  private hashOtp(otp: string, salt: string) {
    return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
  }

  async generate(phone: string, visitId?: string) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const salt = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + this.ttlMs);

    const row = this.otpRepository.create({
      phone,
      otpSalt: salt,
      otpHash: this.hashOtp(otp, salt),
      expiresAt,
      visitId: visitId ? String(visitId) : null,
      attempts: 0,
      usedAt: null,
    });
    await this.otpRepository.save(row);

    return { otp, expiresInSec: Math.floor(this.ttlMs / 1000) };
  }

  async verify(phone: string, otp: string) {
    const now = new Date();
    const active = await this.otpRepository.findOne({
      where: { phone, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!active) return { ok: false as const, reason: 'NO_OTP' as const };
    if (now > active.expiresAt) return { ok: false as const, reason: 'EXPIRED' as const };
    if (active.attempts >= this.maxAttempts) return { ok: false as const, reason: 'TOO_MANY_ATTEMPTS' as const };

    active.attempts += 1;
    const expected = active.otpHash;
    const actual = this.hashOtp(String(otp).trim(), active.otpSalt);

    if (actual !== expected) {
      await this.otpRepository.save(active);
      return { ok: false as const, reason: 'INVALID' as const };
    }

    active.usedAt = new Date();
    await this.otpRepository.save(active);
    return { ok: true as const };
  }
}

