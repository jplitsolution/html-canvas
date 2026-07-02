import { BadRequestException, Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OtpSendDto, OtpVerifyDto } from './dto/otp.dto';
import { OtpService } from './otp.service';

@ApiTags('Public OTP')
@Controller('otp')
export class OtpController {
  private readonly logger = new Logger(OtpController.name);

  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send OTP (dev mock)' })
  async send(@Body() body: OtpSendDto) {
    const phone = body.phone;
    const { otp, expiresInSec } = await this.otpService.generate(phone, body.visitId);

    // NOTE: In production this should call your SMS/OTP provider.
    // For now we only log the OTP so frontend dev/testing can proceed.
    this.logger.log(`OTP generated phone=${phone} visitId=${body.visitId || 'n/a'} otp=${otp}`);

    return {
      sent: true,
      expiresInSec,
      // returned only for local/dev convenience; remove when provider integrated
      otp,
    };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP (dev mock)' })
  async verify(@Body() body: OtpVerifyDto) {
    const result = await this.otpService.verify(body.phone, body.otp);
    if (!result.ok) {
      throw new BadRequestException(
        result.reason === 'INVALID'
          ? 'Invalid OTP'
          : result.reason === 'EXPIRED'
            ? 'OTP expired'
            : result.reason === 'TOO_MANY_ATTEMPTS'
              ? 'Too many attempts'
              : 'OTP not found',
      );
    }
    return { verified: true };
  }
}

