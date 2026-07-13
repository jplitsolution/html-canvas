import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Visit } from './entities/visit.entity';
import { VisitEvent } from './entities/visit-event.entity';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SearchService } from '../search/search.service';
import { RedisService } from '../../common/services/redis.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockVisitRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((visit) => Promise.resolve({ id: 1, ...visit })),
    count: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockVisitEventRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((event) => Promise.resolve({ id: 1, ...event })),
    count: jest.fn().mockResolvedValue(0),
    insert: jest.fn(),
  };

  const mockCampaignsService = {
    findOne: jest.fn().mockResolvedValue({ id: 1, name: 'India Zain' }),
  };

  const mockSearchService = {
    isEnabled: jest.fn().mockReturnValue(false),
    indexEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(Visit), useValue: mockVisitRepository },
        {
          provide: getRepositoryToken(VisitEvent),
          useValue: mockVisitEventRepository,
        },
        { provide: CampaignsService, useValue: mockCampaignsService },
        { provide: SearchService, useValue: mockSearchService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCampaignAnalytics', () => {
    it('should aggregate visits stats and calculate conversionRate correctly', async () => {
      mockVisitRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(5);

      const stats = await service.getCampaignAnalytics(1, 1);
      expect(stats).toEqual({
        totalVisits: 100,
        blockedUsers: 10,
        subscribedUsers: 20,
        successfulSubscriptions: 30,
        failedSubscriptions: 5,
        conversionRate: 30,
        blockedRequests: 0,
        rateLimitHits: 0,
        bruteForceAttempts: 0,
      });
    });
  });
});
