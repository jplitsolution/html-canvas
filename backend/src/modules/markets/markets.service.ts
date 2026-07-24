import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { Operator } from './entities/operator.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CreateMarketDto } from './dto/create-market.dto';
import {
  buildTrackingId,
  normalizeCode,
} from './tracking-id.util';

export type MarketListItem = {
  countryId: number;
  countryName: string;
  countryCode: string;
  operatorId: number;
  operatorName: string;
  operatorCode: string;
  campaignCount: number;
};

@Injectable()
export class MarketsService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(Operator)
    private readonly operatorRepository: Repository<Operator>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  async listMarkets(userId: number): Promise<MarketListItem[]> {
    const operators = await this.operatorRepository.find({
      where: { userId },
      relations: { country: true },
      order: { updatedAt: 'DESC' },
    });

    const counts = await this.campaignRepository
      .createQueryBuilder('c')
      .select('c.operatorId', 'operatorId')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.userId = :userId', { userId })
      .andWhere('c.operatorId IS NOT NULL')
      .groupBy('c.operatorId')
      .getRawMany<{ operatorId: number; cnt: string }>();

    const countMap = new Map(
      counts.map((r) => [Number(r.operatorId), Number(r.cnt)]),
    );

    return operators.map((op) => ({
      countryId: op.country.id,
      countryName: op.country.name,
      countryCode: op.country.code,
      operatorId: op.id,
      operatorName: op.name,
      operatorCode: op.code,
      campaignCount: countMap.get(op.id) || 0,
    }));
  }

  async createMarket(
    dto: CreateMarketDto,
    userId: number,
  ): Promise<MarketListItem> {
    const countryCode = normalizeCode(dto.countryCode);
    const operatorCode = normalizeCode(dto.operatorCode);
    if (!countryCode || !operatorCode) {
      throw new ConflictException('countryCode and operatorCode are required');
    }

    let country = await this.countryRepository.findOne({
      where: { userId, code: countryCode },
    });
    if (!country) {
      country = await this.countryRepository.save(
        this.countryRepository.create({
          name: dto.countryName.trim(),
          code: countryCode,
          userId,
        }),
      );
    } else if (
      dto.countryName.trim() &&
      country.name.toLowerCase() !== dto.countryName.trim().toLowerCase()
    ) {
      // Keep existing name; codes are the identity
    }

    const existingOp = await this.operatorRepository.findOne({
      where: { countryId: country.id, code: operatorCode },
      relations: { country: true },
    });
    if (existingOp) {
      throw new ConflictException(
        `Market already exists for ${country.code} / ${operatorCode}`,
      );
    }

    const operator = await this.operatorRepository.save(
      this.operatorRepository.create({
        name: dto.operatorName.trim(),
        code: operatorCode,
        countryId: country.id,
        userId,
      }),
    );

    return {
      countryId: country.id,
      countryName: country.name,
      countryCode: country.code,
      operatorId: operator.id,
      operatorName: operator.name,
      operatorCode: operator.code,
      campaignCount: 0,
    };
  }

  async findMarketByCodes(
    countryCode: string,
    operatorCode: string,
    userId: number,
  ): Promise<{ country: Country; operator: Operator }> {
    const cc = normalizeCode(countryCode);
    const oc = normalizeCode(operatorCode);

    const country = await this.countryRepository.findOne({
      where: { userId, code: cc },
    });
    if (!country) {
      throw new NotFoundException(`Country ${cc} not found`);
    }

    const operator = await this.operatorRepository.findOne({
      where: { countryId: country.id, code: oc, userId },
      relations: { country: true },
    });
    if (!operator) {
      throw new NotFoundException(`Operator ${oc} not found for ${cc}`);
    }

    return { country, operator };
  }

  async getMarket(
    countryCode: string,
    operatorCode: string,
    userId: number,
  ): Promise<MarketListItem> {
    const { country, operator } = await this.findMarketByCodes(
      countryCode,
      operatorCode,
      userId,
    );
    const campaignCount = await this.campaignRepository.count({
      where: { operatorId: operator.id, userId },
    });
    return {
      countryId: country.id,
      countryName: country.name,
      countryCode: country.code,
      operatorId: operator.id,
      operatorName: operator.name,
      operatorCode: operator.code,
      campaignCount,
    };
  }

  async listCampaignsForMarket(
    countryCode: string,
    operatorCode: string,
    userId: number,
  ): Promise<Campaign[]> {
    const { country, operator } = await this.findMarketByCodes(
      countryCode,
      operatorCode,
      userId,
    );

    const campaigns = await this.campaignRepository.find({
      where: { operatorId: operator.id, userId },
      relations: {
        pages: { template: true },
        trackings: { vendor: true, affiliate: true },
        marketOperator: { country: true },
      },
      order: { updatedAt: 'DESC' },
    });

    return campaigns.map((c) => {
      const withId = this.attachTrackingId(c, country.code, operator.code);
      if (withId.pages) {
        withId.pages = withId.pages.map((page) => {
          if (page.template?.data) {
            page.template.data = {
              ...page.template.data,
              projectData: undefined,
              html: page.template.data.html ? '[saved]' : '',
              css: page.template.data.css ? '[saved]' : '',
            };
          }
          return page;
        });
      }
      return withId;
    });
  }

  async resolveOperatorForCreate(input: {
    userId: number;
    operatorId?: number;
    countryCode?: string;
    operatorCode?: string;
    countryName?: string;
    operatorName?: string;
  }): Promise<{ country: Country; operator: Operator }> {
    if (input.operatorId) {
      const operator = await this.operatorRepository.findOne({
        where: { id: input.operatorId },
        relations: { country: true },
      });
      if (!operator) {
        throw new NotFoundException(`Operator ${input.operatorId} not found`);
      }
      if (operator.userId !== input.userId) {
        throw new ForbiddenException('You do not have access to this market');
      }
      return { country: operator.country, operator };
    }

    const countryCode = normalizeCode(input.countryCode || '');
    const operatorCode = normalizeCode(input.operatorCode || '');
    if (!countryCode || !operatorCode) {
      throw new ConflictException(
        'operatorId or countryCode+operatorCode is required',
      );
    }

    let country = await this.countryRepository.findOne({
      where: { userId: input.userId, code: countryCode },
    });
    if (!country) {
      country = await this.countryRepository.save(
        this.countryRepository.create({
          name: (input.countryName || countryCode).trim(),
          code: countryCode,
          userId: input.userId,
        }),
      );
    }

    let operator = await this.operatorRepository.findOne({
      where: {
        countryId: country.id,
        code: operatorCode,
        userId: input.userId,
      },
      relations: { country: true },
    });
    if (!operator) {
      operator = await this.operatorRepository.save(
        this.operatorRepository.create({
          name: (input.operatorName || operatorCode).trim(),
          code: operatorCode,
          countryId: country.id,
          userId: input.userId,
        }),
      );
      operator.country = country;
    }

    return { country, operator };
  }

  attachTrackingId(
    campaign: Campaign,
    countryCode?: string,
    operatorCode?: string,
  ): Campaign {
    const cc =
      countryCode ||
      campaign.marketOperator?.country?.code ||
      '';
    const oc = operatorCode || campaign.marketOperator?.code || '';
    if (cc && oc && campaign.id) {
      campaign.trackingId = buildTrackingId(cc, oc, campaign.id);
    }
    return campaign;
  }
}
