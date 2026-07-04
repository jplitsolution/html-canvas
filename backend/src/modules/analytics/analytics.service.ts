import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Visit, VisitStatus } from './entities/visit.entity';
import { VisitEvent, VisitEventType } from './entities/visit-event.entity';
import { CampaignAnalyticsDto } from './dto/campaign-analytics.dto';
import { CampaignsService } from '../campaigns/campaigns.service';
import { OtpRequest } from '../otp/entities/otp-request.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { OtpService } from '../otp/otp.service';

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

  async updateVisit(
    id: number,
    status: VisitStatus,
    pageType?: string,
  ): Promise<Visit> {
    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) return null as any;

    visit.visitStatus = status;
    if (pageType) {
      visit.pageType = pageType;
    }

    return this.visitRepository.save(visit);
  }

  async logEvent(
    visitId: number,
    eventType: VisitEventType,
    metadata?: any,
  ): Promise<VisitEvent> {
    const event = this.visitEventRepository.create({
      visitId,
      eventType,
      metadata,
    });
    return this.visitEventRepository.save(event);
  }

  async getCampaignAnalytics(
    campaignId: number,
    userId: number,
  ): Promise<CampaignAnalyticsDto> {
    await this.campaignsService.findOne(campaignId, userId);

    const totalVisits = await this.visitRepository.count({
      where: { campaignId },
    });
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

    const blockedRequests = await this.visitEventRepository.count({
      where: {
        eventType: VisitEventType.BLOCKED_REQUEST,
        visit: { campaignId },
      },
      relations: { visit: true },
    });

    const rateLimitHits = await this.visitEventRepository.count({
      where: {
        eventType: VisitEventType.RATE_LIMIT_HIT,
        visit: { campaignId },
      },
      relations: { visit: true },
    });

    const bruteForceAttempts = await this.visitEventRepository.count({
      where: {
        eventType: VisitEventType.BRUTE_FORCE_ATTEMPT,
        visit: { campaignId },
      },
      relations: { visit: true },
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
      blockedRequests,
      rateLimitHits,
      bruteForceAttempts,
    };
  }

  async getOtpAnalytics(campaignId?: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const baseWhere: any = {
      createdAt: MoreThan(thirtyDaysAgo),
    };
    if (campaignId !== undefined) {
      baseWhere.campaignId = campaignId;
    }

    const requests = await this.visitRepository.manager.getRepository(OtpRequest).find({
      where: baseWhere,
      select: {
        id: true,
        status: true,
        provider: true,
        attempts: true,
        createdAt: true,
        verifiedAt: true,
        campaignId: true,
        phone: true,
        visitId: true,
      },
    });

    const campaigns = await this.visitRepository.manager.getRepository(Campaign).find({
      select: {
        id: true,
        country: true,
        operator: true,
        name: true,
      },
    });
    const campaignMap = new Map<number, typeof campaigns[0]>();
    campaigns.forEach(c => campaignMap.set(c.id, c));

    // Summary stats
    const totalRequests = requests.length;
    const sentRequests = requests.filter(r => ['sent', 'verified', 'used'].includes(r.status || '')).length;
    const verifiedRequests = requests.filter(r => r.status === 'verified' || r.verifiedAt !== null).length;
    const failedRequests = requests.filter(r => r.status === 'failed').length;

    const verificationRate = totalRequests > 0 ? parseFloat(((verifiedRequests / totalRequests) * 100).toFixed(2)) : 0;
    const failureRate = totalRequests > 0 ? parseFloat(((failedRequests / totalRequests) * 100).toFixed(2)) : 0;
    const successRate = sentRequests > 0 ? parseFloat(((verifiedRequests / sentRequests) * 100).toFixed(2)) : 0;

    // Average verification time
    let totalVerifTime = 0;
    let verifCount = 0;
    requests.forEach(r => {
      if (r.verifiedAt && r.createdAt) {
        const diff = (r.verifiedAt.getTime() - r.createdAt.getTime()) / 1000;
        if (diff >= 0) {
          totalVerifTime += diff;
          verifCount++;
        }
      }
    });
    const avgVerificationTime = verifCount > 0 ? parseFloat((totalVerifTime / verifCount).toFixed(1)) : 0;

    // Average resend count
    const phoneGroups = new Map<string, number>();
    requests.forEach(r => {
      if (r.phone) {
        phoneGroups.set(r.phone, (phoneGroups.get(r.phone) || 0) + 1);
      }
    });
    let totalResends = 0;
    phoneGroups.forEach(count => {
      totalResends += (count - 1);
    });
    const avgResendCount = phoneGroups.size > 0 ? parseFloat((totalResends / phoneGroups.size).toFixed(2)) : 0;

    // Provider performance
    const providerMap = new Map<string, { total: number; verified: number; failed: number }>();
    requests.forEach(r => {
      const prov = r.provider || 'local';
      if (!providerMap.has(prov)) {
        providerMap.set(prov, { total: 0, verified: 0, failed: 0 });
      }
      const stats = providerMap.get(prov)!;
      stats.total++;
      if (r.status === 'verified' || r.verifiedAt) stats.verified++;
      if (r.status === 'failed') stats.failed++;
    });

    const liveHealth = OtpService.getProviderHealthStatus();
    const liveHealthMap = new Map<string, typeof liveHealth[0]>();
    liveHealth.forEach(lh => liveHealthMap.set(lh.provider, lh));

    const providerPerformance = Array.from(providerMap.entries()).map(([provider, stats]) => {
      const live = liveHealthMap.get(provider);
      return {
        provider,
        total: stats.total,
        verified: stats.verified,
        failed: stats.failed,
        successRate: stats.total > 0 ? parseFloat(((stats.verified / stats.total) * 100).toFixed(2)) : 0,
        tripped: live ? live.tripped : false,
        trippedUntil: live ? live.trippedUntil : null,
        avgLatencyMs: live ? live.avgLatencyMs : 0,
        liveSuccessRate: live ? live.successRate : 100,
        liveTotalRequests: live ? live.totalRequests : 0,
      };
    });

    liveHealth.forEach(lh => {
      if (!providerMap.has(lh.provider)) {
        providerPerformance.push({
          provider: lh.provider,
          total: 0,
          verified: 0,
          failed: 0,
          successRate: 100,
          tripped: lh.tripped,
          trippedUntil: lh.trippedUntil,
          avgLatencyMs: lh.avgLatencyMs,
          liveSuccessRate: lh.successRate,
          liveTotalRequests: lh.totalRequests,
        });
      }
    });

    // Country/Operator performance
    const countryMap = new Map<string, { total: number; verified: number }>();
    const operatorMap = new Map<string, { total: number; verified: number }>();
    requests.forEach(r => {
      const camp = r.campaignId ? campaignMap.get(r.campaignId) : null;
      const country = camp?.country || 'Unknown';
      const operator = camp?.operator || 'Unknown';

      if (!countryMap.has(country)) countryMap.set(country, { total: 0, verified: 0 });
      if (!operatorMap.has(operator)) operatorMap.set(operator, { total: 0, verified: 0 });

      const cStats = countryMap.get(country)!;
      cStats.total++;
      if (r.status === 'verified' || r.verifiedAt) cStats.verified++;

      const oStats = operatorMap.get(operator)!;
      oStats.total++;
      if (r.status === 'verified' || r.verifiedAt) oStats.verified++;
    });

    const countryPerformance = Array.from(countryMap.entries()).map(([country, stats]) => ({
      country,
      total: stats.total,
      verified: stats.verified,
      successRate: stats.total > 0 ? parseFloat(((stats.verified / stats.total) * 100).toFixed(2)) : 0,
    }));

    const operatorPerformance = Array.from(operatorMap.entries()).map(([operator, stats]) => ({
      operator,
      total: stats.total,
      verified: stats.verified,
      successRate: stats.total > 0 ? parseFloat(((stats.verified / stats.total) * 100).toFixed(2)) : 0,
    }));

    // Trends (Hourly and Daily)
    const dailyMap = new Map<string, number>();
    const hourlyMap = new Map<string, number>();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    requests.forEach(r => {
      if (!r.createdAt) return;
      const dateStr = r.createdAt.toISOString().split('T')[0];
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);

      if (r.createdAt >= oneDayAgo) {
        const hourStr = `${r.createdAt.toISOString().split('T')[0]} ${String(r.createdAt.getHours()).padStart(2, '0')}:00`;
        hourlyMap.set(hourStr, (hourlyMap.get(hourStr) || 0) + 1);
      }
    });

    const dailyTrends = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const hourlyTrends = Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Top Failed Campaigns
    const failedCampMap = new Map<number, { total: number; failed: number }>();
    requests.forEach(r => {
      if (!r.campaignId) return;
      if (!failedCampMap.has(r.campaignId)) {
        failedCampMap.set(r.campaignId, { total: 0, failed: 0 });
      }
      const stats = failedCampMap.get(r.campaignId)!;
      stats.total++;
      if (r.status === 'failed') stats.failed++;
    });
    const topFailedCampaigns = Array.from(failedCampMap.entries())
      .map(([campaignId, stats]) => {
        const camp = campaignMap.get(campaignId);
        return {
          campaignId,
          campaignName: camp ? `${camp.country} / ${camp.operator}` : `Campaign #${campaignId}`,
          total: stats.total,
          failed: stats.failed,
          failureRate: stats.total > 0 ? parseFloat(((stats.failed / stats.total) * 100).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.failed - a.failed)
      .slice(0, 5);

    // Funnel: Requested -> Sent -> Verified -> Subscribed
    const subscribedQuery: any = { visitStatus: VisitStatus.SUCCESS };
    if (campaignId !== undefined) {
      subscribedQuery.campaignId = campaignId;
    }
    const subscribedCount = await this.visitRepository.count({ where: subscribedQuery });

    const funnel = {
      requested: totalRequests,
      sent: sentRequests,
      verified: verifiedRequests,
      subscribed: subscribedCount,
    };

    return {
      summary: {
        totalRequests,
        sentRequests,
        verifiedRequests,
        failedRequests,
        verificationRate,
        failureRate,
        successRate,
        avgVerificationTime,
        avgResendCount,
      },
      providerPerformance,
      countryPerformance,
      operatorPerformance,
      dailyTrends,
      hourlyTrends,
      topFailedCampaigns,
      funnel,
    };
  }
}
