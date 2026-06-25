import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlocklistEntry } from './entities/blocklist-entry.entity';
import { CreateBlocklistEntryDto } from './dto/create-blocklist-entry.dto';
import { UpdateBlocklistEntryDto } from './dto/update-blocklist-entry.dto';

@Injectable()
export class BlocklistService {
  constructor(
    @InjectRepository(BlocklistEntry)
    private readonly blocklistRepository: Repository<BlocklistEntry>,
  ) {}

  async isBlocked(phone: string): Promise<boolean> {
    if (!phone) return false;
    const entry = await this.blocklistRepository.findOne({
      where: { phone, active: true },
    });
    return !!entry;
  }

  async findAll(): Promise<BlocklistEntry[]> {
    return this.blocklistRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<BlocklistEntry> {
    const entry = await this.blocklistRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Blocklist entry with ID ${id} not found`);
    }
    return entry;
  }

  async create(createDto: CreateBlocklistEntryDto): Promise<BlocklistEntry> {
    // Check if entry already exists for phone
    const existing = await this.blocklistRepository.findOne({
      where: { phone: createDto.phone },
    });

    if (existing) {
      existing.active = createDto.active ?? true;
      if (createDto.reason) {
        existing.reason = createDto.reason;
      }
      return this.blocklistRepository.save(existing);
    }

    const entry = this.blocklistRepository.create(createDto);
    return this.blocklistRepository.save(entry);
  }

  async update(id: number, updateDto: UpdateBlocklistEntryDto): Promise<BlocklistEntry> {
    const entry = await this.findOne(id);

    if (updateDto.phone !== undefined) entry.phone = updateDto.phone;
    if (updateDto.reason !== undefined) entry.reason = updateDto.reason;
    if (updateDto.active !== undefined) entry.active = updateDto.active;

    return this.blocklistRepository.save(entry);
  }

  async remove(id: number): Promise<void> {
    const entry = await this.findOne(id);
    await this.blocklistRepository.remove(entry);
  }
}
