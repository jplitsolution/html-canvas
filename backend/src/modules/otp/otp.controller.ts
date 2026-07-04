import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Logger,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OtpSendDto, OtpVerifyDto } from './dto/otp.dto';
import { OtpService } from './otp.service';
import { PublicRateLimitGuard } from '../../common/guards/public-rate-limit.guard';
import axios from 'axios';

@ApiTags('Public OTP')
@Controller('otp')
@UseGuards(PublicRateLimitGuard)
export class OtpController {
  private readonly logger = new Logger(OtpController.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send OTP' })
  async send(@Body() body: OtpSendDto) {
    const phone = body.phone;
    const { otp, expiresInSec } = await this.otpService.generate(
      phone,
      body.visitId,
    );

    // 1. Check if the campaign requires a real provider to determine masking
    let isLocal = true;
    if (body.visitId) {
      try {
        const visit = await this.otpService['visitRepository'].findOne({ where: { id: Number(body.visitId) } });
        if (visit && visit.campaignId) {
          const apiConfig = await this.otpService['apiConfigRepository'].findOne({
            where: { campaignId: visit.campaignId },
          });
          if (apiConfig && apiConfig.otpProvider) {
            const provName = apiConfig.otpProvider.toLowerCase();
            if (provName !== 'local' && provName !== 'mock' && provName !== '') {
              isLocal = false;
            }
          }
        }
      } catch (err) {
        this.logger.error(`Error resolving provider for masking: ${(err as Error).message}`);
      }
    }

    const env = this.configService.get<string>('environment') || 'development';
    const otpExposeTest = this.configService.get<boolean>('otpExposeTest') || false;

    const isProduction = env === 'production';
    const isTesting = env === 'test' || env === 'testing';

    // In Production mode, never return the OTP code
    // In Testing mode, only return if explicitly enabled via config
    // In Development/other modes, return it if it is a local/mock provider
    const showOtp = (isLocal && !isProduction && !isTesting) || (isTesting && otpExposeTest);

    this.logger.log(
      `OTP generation requested phone=${phone} visitId=${body.visitId || 'n/a'} isLocal=${isLocal} showOtp=${showOtp}`,
    );

    return {
      sent: true,
      expiresInSec,
      ...(showOtp ? { otp } : { message: 'OTP sent successfully.' }),
    };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP' })
  async verify(@Body() body: OtpVerifyDto) {
    await this.otpService.verify(body.phone, body.otp, body.visitId);
    return { verified: true };
  }

  @Post('test-send')
  @ApiOperation({ summary: 'Send a test OTP to a phone number' })
  async testSend(
    @Body() body: { phone: string; provider: string; config: string; campaignId?: number },
  ) {
    const env = this.configService.get<string>('environment') || 'development';
    if (env === 'production') {
      throw new ForbiddenException('Test send is disabled in production mode');
    }

    let parsedConfig = {};
    if (body.config) {
      try {
        parsedConfig = typeof body.config === 'object' ? body.config : JSON.parse(body.config);
      } catch {
        throw new BadRequestException('Config must be a valid JSON string');
      }
    }

    const { otp, expiresInSec } = await this.otpService.generate(
      body.phone,
      null,
      {
        provider: body.provider,
        config: parsedConfig,
        campaignId: body.campaignId,
      },
    );

    const otpExposeTest = this.configService.get<boolean>('otpExposeTest') || false;
    const isTesting = env === 'test' || env === 'testing';
    const showOtp = !isTesting || otpExposeTest;

    return {
      sent: true,
      expiresInSec,
      ...(showOtp ? { otp } : { message: 'OTP sent successfully.' }),
    };
  }

  @Post('health-check')
  @ApiOperation({ summary: 'Run provider-specific API connectivity health check' })
  async healthCheck(
    @Body() body: { provider: string; config: string },
  ) {
    const env = this.configService.get<string>('environment') || 'development';
    if (env === 'production') {
      throw new ForbiddenException('Health check is disabled in production mode');
    }

    let parsedConfig: any = {};
    if (body.config) {
      try {
        parsedConfig = typeof body.config === 'object' ? body.config : JSON.parse(body.config);
      } catch {
        throw new BadRequestException('Config must be a valid JSON string');
      }
    }

    const provider = body.provider.toLowerCase();
    try {
      if (provider === 'twilio') {
        const sid = parsedConfig['accountSid'] || parsedConfig['account_sid'];
        const token = parsedConfig['authToken'] || parsedConfig['auth_token'];
        if (!sid || !token) throw new Error('Missing Twilio AccountSid or AuthToken');
        
        await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          },
          timeout: 5000,
        });
      } else if (provider === 'msg91') {
        const key = parsedConfig['authKey'] || parsedConfig['authkey'] || parsedConfig['auth_key'];
        if (!key) throw new Error('Missing MSG91 AuthKey');
      } else if (provider === 'kaleyra') {
        const key = parsedConfig['apiKey'] || parsedConfig['apikey'] || parsedConfig['api_key'];
        if (!key) throw new Error('Missing Kaleyra ApiKey');
      } else if (provider === 'partner') {
        if (!parsedConfig['sendUrl'] || !parsedConfig['verifyUrl']) {
          throw new Error('Partner API config requires both sendUrl and verifyUrl');
        }
      } else if (provider === 'custom' || provider === 'custom_http') {
        if (!parsedConfig['url']) {
          throw new Error('Custom HTTP config requires a destination URL');
        }
      }
      return { ok: true, message: 'Settings format valid and connection parameters checked' };
    } catch (err: any) {
      this.logger.error(`Health check failed for ${provider}: ${err.message}`);
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  }
}
