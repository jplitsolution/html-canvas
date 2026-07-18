import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Affiliate } from './entities/affiliate.entity';
import {
  CreateAffiliateDto,
  CreateVendorDto,
  UpdateAffiliateDto,
  UpdateVendorDto,
} from './dto/partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Affiliate)
    private readonly affiliateRepository: Repository<Affiliate>,
  ) {}

  private normalizeCode(code: string): string {
    return code.trim().toLowerCase();
  }

  // ---- Vendors ----

  async listVendors(userId: number): Promise<Vendor[]> {
    return this.vendorRepository.find({
      where: { userId },
      relations: { affiliates: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getVendor(id: number, userId: number): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id, userId },
      relations: { affiliates: true },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }
    return vendor;
  }

  async createVendor(dto: CreateVendorDto, userId: number): Promise<Vendor> {
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
    id: number,
    dto: UpdateVendorDto,
    userId: number,
  ): Promise<Vendor> {
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

  async removeVendor(id: number, userId: number): Promise<void> {
    const vendor = await this.getVendor(id, userId);
    vendor.active = false;
    await this.vendorRepository.save(vendor);
  }

  // ---- Affiliates ----

  async listAffiliates(vendorId: number, userId: number): Promise<Affiliate[]> {
    await this.getVendor(vendorId, userId);
    return this.affiliateRepository.find({
      where: { vendorId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createAffiliate(
    dto: CreateAffiliateDto,
    userId: number,
  ): Promise<Affiliate> {
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
    id: number,
    dto: UpdateAffiliateDto,
    userId: number,
  ): Promise<Affiliate> {
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

  async removeAffiliate(id: number, userId: number): Promise<void> {
    const affiliate = await this.affiliateRepository.findOne({
      where: { id, userId },
    });
    if (!affiliate) {
      throw new NotFoundException(`Affiliate ${id} not found`);
    }
    affiliate.active = false;
    await this.affiliateRepository.save(affiliate);
  }

  // ---- Attribution resolution (used by the public flow) ----

  /**
   * Resolve raw tracking-URL codes (vid / aff_id) to vendor + affiliate ids.
   * Never throws: unknown codes simply resolve to null so the funnel is never blocked.
   */
  async resolveAttribution(
    vidCode?: string,
    affCode?: string,
  ): Promise<{ vendorId?: number; affiliateId?: number; mismatch: boolean }> {
    let vendorId: number | undefined;
    let affiliateId: number | undefined;
    let mismatch = false;

    const normalizedVid = vidCode ? this.normalizeCode(vidCode) : '';
    const normalizedAff = affCode ? this.normalizeCode(affCode) : '';

    if (normalizedVid) {
      const vendor = await this.vendorRepository.findOne({
        where: { code: normalizedVid },
      });
      if (vendor) vendorId = vendor.id;
    }

    if (normalizedAff) {
      const affiliate = await this.affiliateRepository.findOne({
        where: { code: normalizedAff },
      });
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
