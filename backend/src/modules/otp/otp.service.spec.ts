import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, HttpException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpRequest } from './entities/otp-request.entity';
import { ApiConfig } from '../api-config/entities/api-config.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Visit } from '../analytics/entities/visit.entity';
import { SmsProviderManager } from './providers/sms-provider.manager';
import { VisitEvent } from '../analytics/entities/visit-event.entity';

describe('OtpService', () => {
  let service: OtpService;
  let otpRepoMock: any;
  let apiConfigRepoMock: any;
  let campaignRepoMock: any;
  let visitRepoMock: any;
  let providerManagerMock: any;
  let visitEventRepoMock: any;

  beforeEach(async () => {
    otpRepoMock = {
      findOne: jest.fn((options) => {
        const where = options?.where;
        if (where && where.status === 'failed') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      count: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 1, ...x, createdAt: new Date() })),
    };

    apiConfigRepoMock = {
      findOne: jest.fn(),
    };

    campaignRepoMock = {
      findOne: jest.fn(),
    };

    visitRepoMock = {
      findOne: jest.fn(),
    };

    providerManagerMock = {
      getProvider: jest.fn().mockReturnValue({
        sendOtp: jest.fn().mockResolvedValue({ success: true, providerRequestId: 'test-req-id' }),
      }),
    };

    visitEventRepoMock = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 1, ...x, createdAt: new Date() })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getRepositoryToken(OtpRequest),
          useValue: otpRepoMock,
        },
        {
          provide: getRepositoryToken(ApiConfig),
          useValue: apiConfigRepoMock,
        },
        {
          provide: getRepositoryToken(Campaign),
          useValue: campaignRepoMock,
        },
        {
          provide: getRepositoryToken(Visit),
          useValue: visitRepoMock,
        },
        {
          provide: SmsProviderManager,
          useValue: providerManagerMock,
        },
        {
          provide: getRepositoryToken(VisitEvent),
          useValue: visitEventRepoMock,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it('should generate OTP successfully when rate limits are clean', async () => {
    otpRepoMock.findOne.mockImplementation((options) => {
      const where = options?.where;
      if (where && where.status === 'failed') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    otpRepoMock.count.mockResolvedValue(0);

    const res = await service.generate('919876543210');
    expect(res).toBeDefined();
    expect(res.otp).toHaveLength(6);
    expect(otpRepoMock.save).toHaveBeenCalled();
  });

  it('should throw an error if OTP is requested within resend delay limit (30s)', async () => {
    otpRepoMock.findOne.mockImplementation((options) => {
      const where = options?.where;
      if (where && where.status === 'failed') return Promise.resolve(null);
      return Promise.resolve({
        createdAt: new Date(Date.now() - 15 * 1000), // 15s ago
      });
    });

    try {
      await service.generate('919876543210');
      fail('Should throw exception');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(429);
      expect(err.getResponse().message).toContain('wait 30 seconds');
    }
  });

  it('should throw an error if OTP is requested more than 5 times in 10 minutes', async () => {
    otpRepoMock.findOne.mockImplementation((options) => {
      const where = options?.where;
      if (where && where.status === 'failed') return Promise.resolve(null);
      return Promise.resolve({
        createdAt: new Date(Date.now() - 90 * 1000), // 90s ago (passes resend delay)
      });
    });
    otpRepoMock.count.mockResolvedValue(5); // 5 requests already

    try {
      await service.generate('919876543210');
      fail('Should throw exception');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(429);
      expect(err.getResponse().message).toContain('Too many OTP requests');
    }
  });

  it('should throw an error on verify if no active OTP session exists', async () => {
    otpRepoMock.findOne.mockImplementation((options) => {
      const where = options?.where;
      if (where && where.status === 'failed') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    await expect(service.verify('919876543210', '123456')).rejects.toThrow(
      new BadRequestException('No active OTP request found for this phone number.'),
    );
  });

  it('should throw an error on verify if OTP has expired', async () => {
    otpRepoMock.findOne.mockImplementation((options) => {
      const where = options?.where;
      if (where && where.status === 'failed') return Promise.resolve(null);
      return Promise.resolve({
        phone: '919876543210',
        otpHash: 'somehash',
        createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
        expiresAt: new Date(Date.now() - 1000), // expired 1s ago
        status: 'sent',
        attempts: 0,
      });
    });

    await expect(service.verify('919876543210', '123456')).rejects.toThrow(
      new BadRequestException('OTP has expired.'),
    );
  });

  it('should throw an error on verify if max verification attempts is exceeded', async () => {
    otpRepoMock.findOne.mockImplementation((options) => {
      const where = options?.where;
      if (where && where.status === 'failed') return Promise.resolve(null);
      return Promise.resolve({
        phone: '919876543210',
        otpHash: 'somehash',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
        status: 'sent',
        attempts: 5,
      });
    });

    try {
      await service.verify('919876543210', '123456');
      fail('Should throw exception');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(429);
      expect(err.getResponse().message).toContain('Too many verification attempts');
    }
  });

  it('should automatically fall back to secondary provider if primary provider fails', async () => {
    let callCount = 0;
    const mockPrimary = {
      sendOtp: jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ success: false, error: 'Primary gateway unreachable' });
      }),
    };
    const mockSecondary = {
      sendOtp: jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ success: true, providerRequestId: 'sec-id' });
      }),
    };

    providerManagerMock.getProvider.mockImplementation((name: string) => {
      if (name === 'twilio') return mockPrimary;
      if (name === 'msg91') return mockSecondary;
      return { sendOtp: jest.fn().mockResolvedValue({ success: false }) };
    });

    otpRepoMock.count.mockResolvedValue(0);
    otpRepoMock.findOne.mockResolvedValue(null);

    const testConfig = {
      failover: true,
      providers: {
        twilio: { priority: 1, retryCount: 1, timeout: 1000, config: {} },
        msg91: { priority: 2, retryCount: 1, timeout: 1000, config: {} },
      },
    };

    const res = await service.generate('919876543210', undefined, {
      provider: 'twilio',
      config: testConfig,
      campaignId: 1,
    });

    expect(callCount).toBe(2);
    expect(res.expiresInSec).toBe(300);
    expect(otpRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'msg91',
        providerRequestId: 'sec-id',
      }),
    );
  });
});
