import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let repository: Repository<Subscription>;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    repository = module.get<Repository<Subscription>>(getRepositoryToken(Subscription));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isSubscribed', () => {
    it('should return true if user has active subscription', async () => {
      mockRepository.findOne.mockResolvedValue({ phone: '919876543210', serviceId: 'netflix_123', status: SubscriptionStatus.ACTIVE });
      const result = await service.isSubscribed('919876543210', 'netflix_123');
      expect(result).toBe(true);
    });

    it('should return false if subscription does not exist or not active', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.isSubscribed('919876543210', 'netflix_123');
      expect(result).toBe(false);
    });
  });
});
