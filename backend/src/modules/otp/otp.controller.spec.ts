import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { EntityManager } from 'typeorm';

describe('OtpController Security Hardening', () => {
  let controller: OtpController;
  let otpServiceMock: any;
  let configServiceMock: any;
  let entityManagerMock: any;

  beforeEach(async () => {
    otpServiceMock = {
      generate: jest.fn().mockResolvedValue({
        otp: '123456',
        expiresInSec: 300,
      }),
      verify: jest.fn(),
      visitRepository: {
        findOne: jest.fn().mockResolvedValue({ id: 1, campaignId: 10 }),
      },
      apiConfigRepository: {
        findOne: jest.fn().mockResolvedValue({ otpProvider: 'local' }),
      },
    };

    configServiceMock = {
      get: jest.fn((key) => {
        if (key === 'environment') return 'development';
        if (key === 'otpExposeTest') return false;
        return null;
      }),
    };

    entityManagerMock = {
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtpController],
      providers: [
        { provide: OtpService, useValue: otpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: EntityManager, useValue: entityManagerMock },
      ],
    }).compile();

    controller = module.get<OtpController>(OtpController);
  });

  it('should expose OTP in Development mode for local mock provider', async () => {
    const res = await controller.send({ phone: '919876543210', visitId: 1 });
    expect(res.sent).toBe(true);
    expect(res.otp).toBe('123456');
    expect(res.message).toBeUndefined();
  });

  it('should hide OTP and return sanitized message in Production mode', async () => {
    configServiceMock.get.mockImplementation((key) => {
      if (key === 'environment') return 'production';
      return null;
    });

    const res = await controller.send({ phone: '919876543210', visitId: 1 });
    expect(res.sent).toBe(true);
    expect(res.otp).toBeUndefined();
    expect(res.message).toBe('OTP sent successfully.');
  });

  it('should hide OTP in Testing mode by default', async () => {
    configServiceMock.get.mockImplementation((key) => {
      if (key === 'environment') return 'test';
      if (key === 'otpExposeTest') return false;
      return null;
    });

    const res = await controller.send({ phone: '919876543210', visitId: 1 });
    expect(res.sent).toBe(true);
    expect(res.otp).toBeUndefined();
    expect(res.message).toBe('OTP sent successfully.');
  });

  it('should expose OTP in Testing mode when explicitly enabled via config', async () => {
    configServiceMock.get.mockImplementation((key) => {
      if (key === 'environment') return 'test';
      if (key === 'otpExposeTest') return true;
      return null;
    });

    const res = await controller.send({ phone: '919876543210', visitId: 1 });
    expect(res.sent).toBe(true);
    expect(res.otp).toBe('123456');
    expect(res.message).toBeUndefined();
  });

  it('should throw ForbiddenException on testSend in Production mode', async () => {
    configServiceMock.get.mockImplementation((key) => {
      if (key === 'environment') return 'production';
      return null;
    });

    await expect(
      controller.testSend({
        phone: '919876543210',
        provider: 'local',
        config: '{}',
      }),
    ).rejects.toThrow(new ForbiddenException('Test send is disabled in production mode'));
  });

  it('should throw ForbiddenException on healthCheck in Production mode', async () => {
    configServiceMock.get.mockImplementation((key) => {
      if (key === 'environment') return 'production';
      return null;
    });

    await expect(
      controller.healthCheck({
        provider: 'twilio',
        config: '{}',
      }),
    ).rejects.toThrow(new ForbiddenException('Health check is disabled in production mode'));
  });
});
