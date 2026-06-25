import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Visit, VisitStatus } from './entities/visit.entity';
import { VisitEvent } from './entities/visit-event.entity';
import { ProjectsService } from '../projects/projects.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockVisitRepository = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(visit => Promise.resolve({ id: 1, ...visit })),
    count: jest.fn(),
  };

  const mockVisitEventRepository = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(event => Promise.resolve({ id: 1, ...event })),
  };

  const mockProjectsService = {
    findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Project 1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Visit),
          useValue: mockVisitRepository,
        },
        {
          provide: getRepositoryToken(VisitEvent),
          useValue: mockVisitEventRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjectAnalytics', () => {
    it('should aggregate visits stats and calculate conversionRate correctly', async () => {
      mockVisitRepository.count
        .mockResolvedValueOnce(100) // totalVisits
        .mockResolvedValueOnce(10)  // blockedUsers
        .mockResolvedValueOnce(20)  // subscribedUsers
        .mockResolvedValueOnce(30)  // successfulSubscriptions
        .mockResolvedValueOnce(5);  // failedSubscriptions

      const stats = await service.getProjectAnalytics(1, 1);
      expect(stats).toEqual({
        totalVisits: 100,
        blockedUsers: 10,
        subscribedUsers: 20,
        successfulSubscriptions: 30,
        failedSubscriptions: 5,
        conversionRate: 30,
      });
    });
  });
});
