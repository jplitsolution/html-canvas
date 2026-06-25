import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoutingService } from './routing.service';
import { BlocklistService } from '../blocklist/blocklist.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Page, PageType } from '../pages/entities/page.entity';
import { Project } from '../projects/entities/project.entity';

describe('RoutingService', () => {
  let service: RoutingService;
  let blocklistService: BlocklistService;
  let subscriptionsService: SubscriptionsService;

  const mockBlocklistService = {
    isBlocked: jest.fn(),
  };

  const mockSubscriptionsService = {
    isSubscribed: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  const mockPageRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        {
          provide: BlocklistService,
          useValue: mockBlocklistService,
        },
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
        {
          provide: getRepositoryToken(Page),
          useValue: mockPageRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
    blocklistService = module.get<BlocklistService>(BlocklistService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolvePage', () => {
    const mockInput = {
      projectId: 1,
      phone: '919876543210',
      country: 'IN',
      operator: 'airtel',
    };

    beforeEach(() => {
      mockProjectRepository.findOne.mockResolvedValue({ id: 1, serviceId: 'netflix_123' });
    });

    it('should route to BLOCKED page when user is blocklisted', async () => {
      mockBlocklistService.isBlocked.mockResolvedValue(true);
      mockPageRepository.findOne.mockResolvedValue({ id: 10, templateId: 5, pageType: PageType.BLOCKED });

      const result = await service.resolvePage(mockInput);
      expect(result).toEqual({
        pageType: PageType.BLOCKED,
        pageId: 10,
        templateId: 5,
      });
      expect(mockBlocklistService.isBlocked).toHaveBeenCalledWith('919876543210');
    });

    it('should route to THANKYOU page when user has active subscription', async () => {
      mockBlocklistService.isBlocked.mockResolvedValue(false);
      mockSubscriptionsService.isSubscribed.mockResolvedValue(true);
      mockPageRepository.findOne.mockResolvedValue({ id: 11, templateId: 6, pageType: PageType.THANKYOU });

      const result = await service.resolvePage(mockInput);
      expect(result).toEqual({
        pageType: PageType.THANKYOU,
        pageId: 11,
        templateId: 6,
      });
      expect(mockSubscriptionsService.isSubscribed).toHaveBeenCalledWith('919876543210', 'netflix_123');
    });

    it('should route to PLAN page when user is normal new user', async () => {
      mockBlocklistService.isBlocked.mockResolvedValue(false);
      mockSubscriptionsService.isSubscribed.mockResolvedValue(false);
      mockPageRepository.findOne.mockResolvedValue({ id: 12, templateId: 7, pageType: PageType.PLAN });

      const result = await service.resolvePage(mockInput);
      expect(result).toEqual({
        pageType: PageType.PLAN,
        pageId: 12,
        templateId: 7,
      });
    });
  });
});
