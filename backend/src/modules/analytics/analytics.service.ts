import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Like, In } from 'typeorm';
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
    phone?: string,
  ): Promise<Visit> {
    const visit = await this.visitRepository.findOne({ where: { id } });
    if (!visit) return null as any;

    visit.visitStatus = status;
    if (pageType) {
      visit.pageType = pageType;
    }
    if (phone && phone.trim() !== '') {
      visit.phone = phone.trim();
    }

    return this.visitRepository.save(visit);
  }

  async setVisitPhone(id: number, phone?: string): Promise<void> {
    const cleanPhone = phone?.trim();
    if (!cleanPhone) return;
    await this.visitRepository.update({ id }, { phone: cleanPhone });
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

  async getOtpAnalytics(userId: number, campaignId?: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userCampaigns = await this.visitRepository.manager.getRepository(Campaign).find({
      where: { userId },
      select: { id: true, country: true, operator: true, name: true },
    });

    if (campaignId !== undefined && !userCampaigns.some((c) => c.id === campaignId)) {
      throw new ForbiddenException(
        'You do not have permission to access this campaign',
      );
    }

    const campaignMap = new Map(userCampaigns.map((c) => [c.id, c]));
    const userCampaignIds = userCampaigns.map((c) => c.id);

    const emptyAnalytics = () => ({
      summary: {
        totalRequests: 0,
        sentRequests: 0,
        verifiedRequests: 0,
        failedRequests: 0,
        verificationRate: 0,
        failureRate: 0,
        successRate: 0,
        avgVerificationTime: 0,
        avgResendCount: 0,
      },
      providerPerformance: [],
      countryPerformance: [],
      operatorPerformance: [],
      campaignPerformance: [],
      dailyTrends: [],
      hourlyTrends: [],
      topFailedCampaigns: [],
      funnel: { requested: 0, sent: 0, verified: 0, subscribed: 0 },
      period: {
        days: 30,
        from: thirtyDaysAgo.toISOString(),
        to: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    });

    if (userCampaignIds.length === 0) {
      return emptyAnalytics();
    }

    const scopedCampaignFilter =
      campaignId !== undefined ? campaignId : In(userCampaignIds);

    const userCampaignIdSet = new Set(userCampaignIds.map((id) => Number(id)));
    const otpRepo = this.visitRepository.manager.getRepository(OtpRequest);

    const allRequests = await otpRepo.find({
      where: { createdAt: MoreThan(thirtyDaysAgo) },
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

    const visitIds = [
      ...new Set(
        allRequests
          .map((r) => (r.visitId != null ? Number(r.visitId) : null))
          .filter((id): id is number => id != null && !Number.isNaN(id)),
      ),
    ];

    const visits = visitIds.length
      ? await this.visitRepository.find({
          where: { id: In(visitIds) },
          select: { id: true, campaignId: true, country: true, operator: true },
        })
      : [];
    const visitMap = new Map(visits.map((v) => [Number(v.id), v]));

    const resolveCampaignId = (r: OtpRequest): number | null => {
      const fromOtp =
        r.campaignId != null && Number(r.campaignId) > 0
          ? Number(r.campaignId)
          : null;
      const visit = r.visitId != null ? visitMap.get(Number(r.visitId)) : undefined;
      const fromVisit =
        visit?.campaignId != null && Number(visit.campaignId) > 0
          ? Number(visit.campaignId)
          : null;
      const resolved = fromOtp ?? fromVisit ?? null;
      if (resolved == null || Number.isNaN(resolved) || !userCampaignIdSet.has(resolved)) {
        return null;
      }
      return resolved;
    };

    const resolveMeta = (resolvedCampaignId: number, visitId?: number | null) => {
      const camp = campaignMap.get(resolvedCampaignId);
      const visit = visitId != null ? visitMap.get(Number(visitId)) : undefined;
      return {
        country: camp?.country || visit?.country || '—',
        operator: camp?.operator || visit?.operator || '—',
        name: camp?.name || `Campaign #${resolvedCampaignId}`,
      };
    };

    let requests = allRequests.filter((r) => resolveCampaignId(r) !== null);
    if (campaignId !== undefined) {
      requests = requests.filter((r) => resolveCampaignId(r) === campaignId);
    }

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

    // Country/Operator/Campaign performance
    const countryMap = new Map<string, { total: number; verified: number; failed: number; sent: number }>();
    const operatorMap = new Map<string, { total: number; verified: number; failed: number; sent: number; countries: Set<string> }>();
    const campaignStatsMap = new Map<number, { total: number; verified: number; failed: number; sent: number }>();

    const campaignsToShow =
      campaignId !== undefined
        ? userCampaigns.filter((c) => c.id === campaignId)
        : userCampaigns;
    for (const c of campaignsToShow) {
      campaignStatsMap.set(Number(c.id), { total: 0, verified: 0, failed: 0, sent: 0 });
    }

    requests.forEach((r) => {
      const resolvedCampaignId = resolveCampaignId(r)!;
      const meta = resolveMeta(resolvedCampaignId, r.visitId);
      const country = meta.country;
      const operator = meta.operator;
      const isVerified = r.status === 'verified' || r.verifiedAt !== null;
      const isFailed = r.status === 'failed';
      const isSent = ['sent', 'verified', 'used'].includes(r.status || '');

      if (!countryMap.has(country)) countryMap.set(country, { total: 0, verified: 0, failed: 0, sent: 0 });
      if (!operatorMap.has(operator)) {
        operatorMap.set(operator, { total: 0, verified: 0, failed: 0, sent: 0, countries: new Set() });
      }
      if (!campaignStatsMap.has(resolvedCampaignId)) {
        campaignStatsMap.set(resolvedCampaignId, { total: 0, verified: 0, failed: 0, sent: 0 });
      }

      const cStats = countryMap.get(country)!;
      cStats.total++;
      if (isVerified) cStats.verified++;
      if (isFailed) cStats.failed++;
      if (isSent) cStats.sent++;

      const oStats = operatorMap.get(operator)!;
      oStats.total++;
      if (isVerified) oStats.verified++;
      if (isFailed) oStats.failed++;
      if (isSent) oStats.sent++;
      if (country !== '—' && country !== 'Unknown') oStats.countries.add(country);

      const campStats = campaignStatsMap.get(resolvedCampaignId)!;
      campStats.total++;
      if (isVerified) campStats.verified++;
      if (isFailed) campStats.failed++;
      if (isSent) campStats.sent++;
    });

    const subscribedVisits = await this.visitRepository.find({
      where: {
        visitStatus: VisitStatus.SUCCESS,
        createdAt: MoreThan(thirtyDaysAgo),
        campaignId: scopedCampaignFilter,
      },
      select: { campaignId: true },
    });
    const subscribedByCampaign = new Map<number, number>();
    subscribedVisits.forEach(v => {
      const id = Number(v.campaignId);
      subscribedByCampaign.set(id, (subscribedByCampaign.get(id) || 0) + 1);
    });

    const pct = (num: number, den: number) =>
      den > 0 ? parseFloat(((num / den) * 100).toFixed(2)) : 0;

    const countryPerformance = Array.from(countryMap.entries())
      .map(([country, stats]) => ({
        country,
        total: stats.total,
        verified: stats.verified,
        failed: stats.failed,
        sent: stats.sent,
        successRate: pct(stats.verified, stats.total),
        failureRate: pct(stats.failed, stats.total),
      }))
      .sort((a, b) => b.total - a.total);

    const operatorPerformance = Array.from(operatorMap.entries())
      .map(([operator, stats]) => ({
        operator,
        countries: Array.from(stats.countries).sort(),
        total: stats.total,
        verified: stats.verified,
        failed: stats.failed,
        sent: stats.sent,
        successRate: pct(stats.verified, stats.total),
        failureRate: pct(stats.failed, stats.total),
      }))
      .sort((a, b) => b.total - a.total);

    const campaignPerformance = Array.from(campaignStatsMap.entries())
      .map(([id, stats]) => {
        const camp = campaignMap.get(Number(id));
        const meta = resolveMeta(Number(id));
        const subscribed = subscribedByCampaign.get(Number(id)) || 0;
        return {
          campaignId: Number(id),
          campaignName: camp?.name || meta.name,
          country: camp?.country || meta.country,
          operator: camp?.operator || meta.operator,
          total: stats.total,
          sent: stats.sent,
          verified: stats.verified,
          failed: stats.failed,
          subscribed,
          successRate: pct(stats.verified, stats.total),
          failureRate: pct(stats.failed, stats.total),
          conversionRate: pct(subscribed, stats.verified),
        };
      })
      .sort((a, b) => b.total - a.total || a.campaignName.localeCompare(b.campaignName));

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
    requests.forEach((r) => {
      const resolvedCampaignId = resolveCampaignId(r);
      if (resolvedCampaignId == null) return;
      if (!failedCampMap.has(resolvedCampaignId)) {
        failedCampMap.set(resolvedCampaignId, { total: 0, failed: 0 });
      }
      const stats = failedCampMap.get(resolvedCampaignId)!;
      stats.total++;
      if (r.status === 'failed') stats.failed++;
    });
    const topFailedCampaigns = Array.from(failedCampMap.entries())
      .map(([cid, stats]) => {
        const camp = campaignMap.get(Number(cid));
        const meta = resolveMeta(Number(cid));
        return {
          campaignId: Number(cid),
          campaignName: camp
            ? `${camp.country} / ${camp.operator}`
            : `${meta.country} / ${meta.operator}`,
          total: stats.total,
          failed: stats.failed,
          failureRate: stats.total > 0 ? parseFloat(((stats.failed / stats.total) * 100).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.failed - a.failed)
      .slice(0, 5);

    // Funnel: Requested -> Sent -> Verified -> Subscribed
    const subscribedCount = await this.visitRepository.count({
      where: {
        visitStatus: VisitStatus.SUCCESS,
        createdAt: MoreThan(thirtyDaysAgo),
        campaignId: scopedCampaignFilter,
      },
    });

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
      campaignPerformance,
      dailyTrends,
      hourlyTrends,
      topFailedCampaigns,
      funnel,
      period: {
        days: 30,
        from: thirtyDaysAgo.toISOString(),
        to: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getCampaignActivityLogs(
    campaignId: number,
    userId: number,
    query: { page?: number; limit?: number; phone?: string; status?: string },
  ) {
    await this.campaignsService.findOne(campaignId, userId);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { campaignId };

    if (query.phone && query.phone.trim() !== '') {
      where.phone = Like(`%${query.phone.trim()}%`);
    }

    if (query.status && query.status.trim() !== '' && query.status !== 'all') {
      where.visitStatus = query.status;
    }

    const [data, total] = await this.visitRepository.findAndCount({
      where,
      relations: { events: true },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip,
    });

    // Sort events for each visit chronologically by createdAt (ASC)
    data.forEach((visit) => {
      if (visit.events) {
        visit.events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    const visitsMissingPhone = data.filter((visit) => !visit.phone);
    if (visitsMissingPhone.length > 0) {
      const visitIds = visitsMissingPhone.map((visit) => visit.id);
      const otpRequests = await this.visitRepository.manager
        .getRepository(OtpRequest)
        .find({
          where: { visitId: In(visitIds) },
          select: { visitId: true, phone: true, createdAt: true },
          order: { createdAt: 'DESC' },
        });

      const phoneByVisitId = new Map<number, string>();
      otpRequests.forEach((request) => {
        if (
          request.visitId &&
          request.phone &&
          !phoneByVisitId.has(request.visitId)
        ) {
          phoneByVisitId.set(request.visitId, request.phone);
        }
      });

      visitsMissingPhone.forEach((visit) => {
        const resolvedPhone = phoneByVisitId.get(visit.id);
        if (resolvedPhone) {
          visit.phone = resolvedPhone;
        }
      });
    }

    const enrichedData = data.map((visit) => ({
      ...visit,
      pagePath: this.derivePagePath(visit),
    }));

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private derivePagePath(visit: Visit): string[] {
    const eventToPage: Partial<Record<VisitEventType, string>> = {
      [VisitEventType.VISIT]: 'HOME',
      [VisitEventType.HOME_VIEW]: 'HOME',
      [VisitEventType.OTP_VIEW]: 'OTP',
      [VisitEventType.OTP_SEND]: 'OTP',
      [VisitEventType.OTP_VERIFY]: 'OTP',
      [VisitEventType.CONFIRM_VIEW]: 'CONFIRM',
      [VisitEventType.PLAN_VIEW]: 'CONFIRM',
      [VisitEventType.SUBSCRIBE_SUCCESS]: 'THANKYOU',
      [VisitEventType.SUBSCRIBE_FAILED]: 'ERROR',
      [VisitEventType.BLOCKED]: 'BLOCKED',
    };

    const pages: string[] = [];
    for (const event of visit.events || []) {
      const page = eventToPage[event.eventType];
      if (page && pages[pages.length - 1] !== page) {
        pages.push(page);
      }
    }

    const finalPage = visit.pageType || 'HOME';
    if (pages.length === 0 || pages[pages.length - 1] !== finalPage) {
      pages.push(finalPage);
    }

    return pages;
  }
}

