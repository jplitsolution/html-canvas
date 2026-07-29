import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { Affiliate } from './entities/affiliate.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Vendor)
    vendorRepository,
    @InjectRepository(Affiliate)
    affiliateRepository,
  ) {
    this.vendorRepository = vendorRepository;
    this.affiliateRepository = affiliateRepository;
  }

  normalizeCode(code) {
    return code.trim().toLowerCase();
  }

  async listVendors(userId) {
    return this.vendorRepository.find({
      where: { userId },
      relations: { affiliates: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getVendor(id, userId) {
    const vendor = await this.vendorRepository.findOne({
      where: { id, userId },
      relations: { affiliates: true },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }
    return vendor;
  }

  async createVendor(dto, userId) {
    const code = this.normalizeCode(dto.code);
    const existing = await this.vendorRepository.findOne({
      where: { userId, code },
    });
    if (existing) {
      throw new ConflictException(`Vendor code "${code}" already exists`);
    }
    const vendor = this.vendorRepository.create({
      name: dto.name.trim(),
      code,
      userId,
      active: dto.active ?? true,
    });
    return this.vendorRepository.save(vendor);
  }

  async updateVendor(
    id,
    dto,
    userId,
  ) {
    const vendor = await this.getVendor(id, userId);
    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (code !== vendor.code) {
        const clash = await this.vendorRepository.findOne({
          where: { userId, code },
        });
        if (clash) {
          throw new ConflictException(`Vendor code "${code}" already exists`);
        }
      }
      vendor.code = code;
    }
    if (dto.name !== undefined) vendor.name = dto.name.trim();
    if (dto.active !== undefined) vendor.active = dto.active;
    return this.vendorRepository.save(vendor);
  }

  async removeVendor(id, userId) {
    const vendor = await this.getVendor(id, userId);
    vendor.active = false;
    await this.vendorRepository.save(vendor);
  }

  async listAffiliates(vendorId, userId) {
    await this.getVendor(vendorId, userId);
    return this.affiliateRepository.find({
      where: { vendorId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createAffiliate(
    dto,
    userId,
  ) {
    await this.getVendor(dto.vendorId, userId);
    const code = this.normalizeCode(dto.code);
    const existing = await this.affiliateRepository.findOne({
      where: { userId, code },
    });
    if (existing) {
      throw new ConflictException(`Affiliate code "${code}" already exists`);
    }
    const affiliate = this.affiliateRepository.create({
      name: dto.name.trim(),
      code,
      vendorId: dto.vendorId,
      userId,
      active: dto.active ?? true,
    });
    return this.affiliateRepository.save(affiliate);
  }

  async updateAffiliate(
    id,
    dto,
    userId,
  ) {
    const affiliate = await this.affiliateRepository.findOne({
      where: { id, userId },
    });
    if (!affiliate) {
      throw new NotFoundException(`Affiliate ${id} not found`);
    }
    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (code !== affiliate.code) {
        const clash = await this.affiliateRepository.findOne({
          where: { userId, code },
        });
        if (clash) {
          throw new ConflictException(`Affiliate code "${code}" already exists`);
        }
      }
      affiliate.code = code;
    }
    if (dto.name !== undefined) affiliate.name = dto.name.trim();
    if (dto.active !== undefined) affiliate.active = dto.active;
    return this.affiliateRepository.save(affiliate);
  }

  async removeAffiliate(id, userId) {
    const affiliate = await this.affiliateRepository.findOne({
      where: { id, userId },
    });
    if (!affiliate) {
      throw new NotFoundException(`Affiliate ${id} not found`);
    }
    affiliate.active = false;
    await this.affiliateRepository.save(affiliate);
  }

  async resolveAttribution(
    vidCode,
    affCode,
  ) {
    let vendorId;
    let affiliateId;
    let mismatch = false;

    const normalizedVid = vidCode ? this.normalizeCode(vidCode) : '';
    const normalizedAff = affCode ? this.normalizeCode(affCode) : '';

    if (normalizedVid) {
      const vendor = await this.vendorRepository
        .createQueryBuilder('v')
        .where('LOWER(v.code) = :code', { code: normalizedVid })
        .getOne();
      if (vendor) vendorId = vendor.id;
    }

    if (normalizedAff) {
      const affiliate = await this.affiliateRepository
        .createQueryBuilder('a')
        .where('LOWER(a.code) = :code', { code: normalizedAff })
        .getOne();
      if (affiliate) {
        affiliateId = affiliate.id;
        if (vendorId && affiliate.vendorId !== vendorId) {
          mismatch = true;
        } else if (!vendorId) {
          vendorId = affiliate.vendorId;
        }
      }
    }

    return { vendorId, affiliateId, mismatch };
  }
}
