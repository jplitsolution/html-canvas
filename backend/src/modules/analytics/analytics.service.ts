import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit, VisitStatus } from './entities/visit.entity';
import { VisitEvent, VisitEventType } from './entities/visit-event.entity';
import { CampaignAnalyticsDto } from './dto/campaign-analytics.dto';
import { CampaignsService } from '../campaigns/campaigns.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(VisitEvent)
    private readonly visitEventRepository: Repository<VisitEvent>,
    private readonly campaignsService: CampaignsService,
  ) {}

  async createVisit(data: Partial<Visit>): Promise<Visit> {
    const visit = this.visitRepository.create(data);
    const saved = await this.visitRepository.save(visit);
    await this.logEvent(saved.id, VisitEventType.VISIT);
    return saved;
  }

  async updateVisit(id: number, status: VisitStatus, pageType?: string): Promise<Visit> {
    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) return null as any;

    visit.visitStatus = status;
    if (pageType) {
      visit.pageType = pageType;
    }

    return this.visitRepository.save(visit);
  }

  async logEvent(visitId: number, eventType: VisitEventType, metadata?: any): Promise<VisitEvent> {
    const event = this.visitEventRepository.create({
      visitId,
      eventType,
      metadata,
    });
    return this.visitEventRepository.save(event);
  }

  async getCampaignAnalytics(campaignId: number, userId: number): Promise<CampaignAnalyticsDto> {
    await this.campaignsService.findOne(campaignId, userId);

    const totalVisits = await this.visitRepository.count({ where: { campaignId } });
    const blockedUsers = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.BLOCKED },
    });
    const subscribedUsers = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.SUBSCRIBED },
    });
    const successfulSubscriptions = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.SUCCESS },
    });
    const failedSubscriptions = await this.visitRepository.count({
      where: { campaignId, visitStatus: VisitStatus.FAILED },
    });

    const conversionRate =
      totalVisits > 0
        ? parseFloat(((successfulSubscriptions / totalVisits) * 100).toFixed(2))
        : 0;

    return {
      totalVisits,
      blockedUsers,
      subscribedUsers,
      successfulSubscriptions,
      failedSubscriptions,
      conversionRate,
    };
  }
}
