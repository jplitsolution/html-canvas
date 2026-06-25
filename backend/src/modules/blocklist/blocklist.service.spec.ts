import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlocklistService } from './blocklist.service';
import { BlocklistEntry } from './entities/blocklist-entry.entity';

describe('BlocklistService', () => {
  let service: BlocklistService;
  let repository: Repository<BlocklistEntry>;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocklistService,
        {
          provide: getRepositoryToken(BlocklistEntry),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BlocklistService>(BlocklistService);
    repository = module.get<Repository<BlocklistEntry>>(getRepositoryToken(BlocklistEntry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isBlocked', () => {
    it('should return true if active blocklist entry exists for phone', async () => {
      mockRepository.findOne.mockResolvedValue({ phone: '919876543210', active: true });
      const result = await service.isBlocked('919876543210');
      expect(result).toBe(true);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '919876543210', active: true },
      });
    });

    it('should return false if active blocklist entry does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.isBlocked('919876543211');
      expect(result).toBe(false);
    });
  });
});
