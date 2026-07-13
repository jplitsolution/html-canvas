import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { DataSource, Brackets } from 'typeorm';
import { VisitEvent } from '../analytics/entities/visit-event.entity';

export interface CampaignEventDoc {
  campaignId?: number;
  visitId?: number;
  vendorId?: number;
  affiliateId?: number;
  clickId?: string;
  vidRaw?: string;
  affRaw?: string;
  phoneMasked?: string;
  country?: string;
  operator?: string;
  pageType?: string;
  eventType?: string;
  status?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface LogSearchParams {
  campaignId: number | number[];
  visitId?: number;
  from?: string;
  to?: string;
  eventType?: string;
  vendorId?: number;
  affiliateId?: number;
  clickId?: string;
  q?: string;
  page?: number;
  size?: number;
  /** Bucket size for timeSeries: hour when viewing a single day / Today */
  interval?: 'hour' | 'day';
  /** IANA timezone for date_histogram / SQL bucketing (e.g. Asia/Kolkata) */
  timezone?: string;
}

/**
 * Thin Elasticsearch wrapper with SQL Database fallback.
 * If ES is not running or offline, queries are handled seamlessly via MySQL.
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Client | null = null;
  private readonly enabled: boolean;
  private readonly index: string;
  private connectionFailed = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.enabled = Boolean(this.configService.get<boolean>('search.enabled'));
    this.index =
      this.configService.get<string>('search.index') || 'campaign_events';
    const node = this.configService.get<string>('search.node');
    if (this.enabled && node) {
      this.client = new Client({ node });
    }
  }

  isEnabled(): boolean {
    return true; // Logs page is always enabled because we have SQL fallback!
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      this.logger.log('Elasticsearch disabled (ELASTICSEARCH_NODE not set). Database fallback active.');
      return;
    }
    try {
      await this.ensureIndex();
      this.logger.log(`Elasticsearch ready. index=${this.index}`);
    } catch (err) {
      this.connectionFailed = true;
      this.logger.warn(
        `Elasticsearch init failed (continuing with database fallback): ${(err as Error).message}`,
      );
    }
  }

  async ensureIndex(): Promise<void> {
    if (!this.client) return;
    const exists = await this.client.indices.exists({ index: this.index });
    if (exists) return;
    await this.client.indices.create({
      index: this.index,
      mappings: {
        properties: {
          campaignId: { type: 'integer' },
          visitId: { type: 'integer' },
          vendorId: { type: 'integer' },
          affiliateId: { type: 'integer' },
          clickId: { type: 'keyword' },
          vidRaw: { type: 'keyword' },
          affRaw: { type: 'keyword' },
          phoneMasked: { type: 'keyword' },
          country: { type: 'keyword' },
          operator: { type: 'keyword' },
          pageType: { type: 'keyword' },
          eventType: { type: 'keyword' },
          status: { type: 'keyword' },
          ip: { type: 'keyword' },
          userAgent: { type: 'text' },
          timestamp: { type: 'date' },
        },
      },
    });
  }

  /** Best-effort indexing; never throws. */
  async indexEvent(doc: CampaignEventDoc): Promise<void> {
    if (!this.client || this.connectionFailed) return;
    try {
      await this.client.index({ index: this.index, document: doc });
    } catch (err) {
      this.logger.warn(`indexEvent failed: ${(err as Error).message}`);
    }
  }

  async bulkIndex(docs: CampaignEventDoc[]): Promise<number> {
    if (!this.client || this.connectionFailed || docs.length === 0) return 0;
    const operations = docs.flatMap((doc) => [
      { index: { _index: this.index } },
      doc,
    ]);
    const res = await this.client.bulk({ operations, refresh: true });
    if (res.errors) {
      this.logger.warn('bulkIndex reported partial errors');
    }
    return docs.length;
  }

  /** Escape wildcard metacharacters for keyword field searches. */
  private escapeWildcard(value: string): string {
    return value.replace(/([\\*?])/g, '\\$1');
  }

  /**
   * Convert a calendar date (YYYY-MM-DD) in `timeZone` to a UTC Date at
   * start-of-day or end-of-day in that zone. Server clock is UTC; user "Today"
   * must follow their profile timezone (e.g. Asia/Kolkata).
   */
  private zonedDayBound(
    dateStr: string,
    timeZone: string,
    bound: 'start' | 'end',
  ): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) {
      const fallback = new Date(dateStr);
      if (bound === 'end' && !dateStr.includes('T')) {
        fallback.setUTCHours(23, 59, 59, 999);
      }
      return fallback;
    }
    const y = Number(match[1]);
    const mo = Number(match[2]);
    const d = Number(match[3]);
    const hour = bound === 'end' ? 23 : 0;
    const minute = bound === 'end' ? 59 : 0;
    const second = bound === 'end' ? 59 : 0;

    const tz = timeZone || 'UTC';
    let utcMs = Date.UTC(y, mo - 1, d, hour, minute, second, 0);

    for (let i = 0; i < 4; i++) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(utcMs));

      const num = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value || '0');
      const seen = Date.UTC(
        num('year'),
        num('month') - 1,
        num('day'),
        num('hour'),
        num('minute'),
        num('second'),
      );
      const desired = Date.UTC(y, mo - 1, d, hour, minute, second);
      const diff = desired - seen;
      utcMs += diff;
      if (diff === 0) break;
    }

    return new Date(bound === 'end' ? utcMs + 999 : utcMs);
  }

  private resolveRangeBounds(params: LogSearchParams): {
    from?: Date;
    to?: Date;
  } {
    const tz = params.timezone || 'UTC';
    return {
      from: params.from ? this.zonedDayBound(params.from, tz, 'start') : undefined,
      to: params.to ? this.zonedDayBound(params.to, tz, 'end') : undefined,
    };
  }

  private buildQuery(params: LogSearchParams): Record<string, unknown> {
    const filter: Array<Record<string, unknown>> = [];
    if (params.campaignId !== undefined) {
      if (Array.isArray(params.campaignId)) {
        if (params.campaignId.length > 0) {
          filter.push({ terms: { campaignId: params.campaignId } });
        } else {
          filter.push({ terms: { campaignId: [-1] } }); // Match nothing if empty array
        }
      } else {
        filter.push({ term: { campaignId: params.campaignId } });
      }
    }
    if (params.visitId !== undefined) {
      filter.push({ term: { visitId: params.visitId } });
    }
    if (params.eventType) filter.push({ term: { eventType: params.eventType } });
    if (params.vendorId) filter.push({ term: { vendorId: params.vendorId } });
    if (params.affiliateId)
      filter.push({ term: { affiliateId: params.affiliateId } });
    if (params.clickId) filter.push({ term: { clickId: params.clickId } });
    if (params.from || params.to) {
      const { from, to } = this.resolveRangeBounds(params);
      const range: Record<string, string> = {};
      if (from) range.gte = from.toISOString();
      if (to) range.lte = to.toISOString();
      filter.push({ range: { timestamp: range } });
    }
    const must: Array<Record<string, unknown>> = [];
    if (params.q) {
      const escaped = this.escapeWildcard(params.q);
      const keywordFields = [
        'clickId',
        'vidRaw',
        'affRaw',
        'phoneMasked',
        'ip',
      ] as const;
      must.push({
        bool: {
          should: [
            { match_phrase_prefix: { userAgent: params.q } },
            ...keywordFields.map((field) => ({
              wildcard: {
                [field]: {
                  value: `*${escaped}*`,
                  case_insensitive: true,
                },
              },
            })),
          ],
          minimum_should_match: 1,
        },
      });
    }
    return { bool: { filter, must } };
  }

  async search(params: LogSearchParams): Promise<{
    total: number;
    page: number;
    size: number;
    items: CampaignEventDoc[];
  }> {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(200, Math.max(1, params.size || 25));

    if (this.client && !this.connectionFailed) {
      try {
        const res = await this.client.search<CampaignEventDoc>({
          index: this.index,
          from: (page - 1) * size,
          size,
          sort: [{ timestamp: { order: 'desc' } }],
          query: this.buildQuery(params) as any,
        });
        const totalValue =
          typeof res.hits.total === 'number'
            ? res.hits.total
            : res.hits.total?.value || 0;
        return {
          total: totalValue,
          page,
          size,
          items: res.hits.hits.map((h) => h._source as CampaignEventDoc),
        };
      } catch (err) {
        this.connectionFailed = true;
        this.logger.warn(
          `Elasticsearch search failed, falling back to SQL database: ${(err as Error).message}`,
        );
      }
    }

    return this.searchFromDb(params);
  }

  private resolveInterval(params: LogSearchParams): 'hour' | 'day' {
    if (params.interval === 'hour' || params.interval === 'day') {
      return params.interval;
    }
    if (params.from && params.to && params.from === params.to) return 'hour';
    return 'day';
  }

  /** Offset like +05:30 for MySQL CONVERT_TZ when named zones are unavailable */
  private getUtcOffsetString(timeZone: string, at: Date = new Date()): string {
    try {
      for (const name of ['longOffset', 'shortOffset'] as const) {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone,
          timeZoneName: name,
          hour: '2-digit',
        }).formatToParts(at);
        const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
        if (!tzName) continue;
        if (tzName === 'GMT' || tzName === 'UTC') return '+00:00';
        const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
        if (match) {
          const sign = match[1];
          const hours = String(parseInt(match[2], 10)).padStart(2, '0');
          const mins = (match[3] || '00').padStart(2, '0');
          return `${sign}${hours}:${mins}`;
        }
      }
      // Fallback: compare wall times
      const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
      const local = new Date(at.toLocaleString('en-US', { timeZone }));
      const offsetMin = Math.round((local.getTime() - utc.getTime()) / 60000);
      const sign = offsetMin >= 0 ? '+' : '-';
      const abs = Math.abs(offsetMin);
      return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
    } catch {
      return '+00:00';
    }
  }

  async aggregations(params: LogSearchParams): Promise<Record<string, unknown>> {
    const interval = this.resolveInterval(params);
    const timeZone = params.timezone || 'UTC';

    if (this.client && !this.connectionFailed) {
      try {
        const res = await this.client.search({
          index: this.index,
          size: 0,
          query: this.buildQuery(params) as any,
          aggs: {
            timeSeries: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: interval,
                time_zone: timeZone,
                min_doc_count: 0,
              },
            },
            byEventType: { terms: { field: 'eventType', size: 30 } },
            byVendor: { terms: { field: 'vendorId', size: 20 } },
            byAffiliate: { terms: { field: 'affiliateId', size: 20 } },
            byStatus: { terms: { field: 'status', size: 20 } },
          },
        });
        const aggs = (res.aggregations || {}) as Record<string, any>;
        const buckets = (key: string) =>
          (aggs[key]?.buckets || []).map((b: any) => ({
            key: b.key_as_string ?? b.key,
            count: b.doc_count,
          }));
        return {
          enabled: true,
          interval,
          timeSeries: buckets('timeSeries'),
          byEventType: buckets('byEventType'),
          byVendor: buckets('byVendor'),
          byAffiliate: buckets('byAffiliate'),
          byStatus: buckets('byStatus'),
        };
      } catch (err) {
        this.connectionFailed = true;
        this.logger.warn(
          `Elasticsearch aggregations failed, falling back to SQL database: ${(err as Error).message}`,
        );
      }
    }

    return this.aggregationsFromDb(params, interval, timeZone);
  }

  private applyDbFilters(queryBuilder: any, params: LogSearchParams): void {
    if (Array.isArray(params.campaignId)) {
      queryBuilder.where('visit.campaignId IN (:...campaignIds)', {
        campaignIds: params.campaignId.length > 0 ? params.campaignId : [-1],
      });
    } else {
      queryBuilder.where('visit.campaignId = :campaignId', {
        campaignId: params.campaignId,
      });
    }

    if (params.visitId !== undefined) {
      queryBuilder.andWhere('event.visitId = :visitId', {
        visitId: params.visitId,
      });
    }

    if (params.eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', {
        eventType: params.eventType,
      });
    }
    if (params.vendorId) {
      queryBuilder.andWhere('visit.vendorId = :vendorId', {
        vendorId: params.vendorId,
      });
    }
    if (params.affiliateId) {
      queryBuilder.andWhere('visit.affiliateId = :affiliateId', {
        affiliateId: params.affiliateId,
      });
    }
    if (params.clickId) {
      queryBuilder.andWhere('visit.clickId = :clickId', {
        clickId: params.clickId,
      });
    }
    if (params.from || params.to) {
      const { from, to } = this.resolveRangeBounds(params);
      if (from) {
        queryBuilder.andWhere('event.createdAt >= :from', { from });
      }
      if (to) {
        queryBuilder.andWhere('event.createdAt <= :to', { to });
      }
    }

    if (params.q) {
      const searchLike = `%${params.q}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('visit.clickId LIKE :searchLike', { searchLike })
            .orWhere('visit.vidRaw LIKE :searchLike', { searchLike })
            .orWhere('visit.affRaw LIKE :searchLike', { searchLike })
            .orWhere('visit.phone LIKE :searchLike', { searchLike })
            .orWhere('visit.ipAddress LIKE :searchLike', { searchLike })
            .orWhere('visit.userAgent LIKE :searchLike', { searchLike });
        }),
      );
    }
  }

  private maskPhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  }

  private async searchFromDb(params: LogSearchParams): Promise<{
    total: number;
    page: number;
    size: number;
    items: CampaignEventDoc[];
  }> {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(200, Math.max(1, params.size || 25));

    const queryBuilder = this.dataSource
      .getRepository(VisitEvent)
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.visit', 'visit');

    this.applyDbFilters(queryBuilder, params);

    queryBuilder
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    const [events, total] = await queryBuilder.getManyAndCount();

    const items: CampaignEventDoc[] = events.map((event) => ({
      campaignId: event.visit?.campaignId,
      visitId: event.visitId,
      vendorId: event.visit?.vendorId,
      affiliateId: event.visit?.affiliateId,
      clickId: event.visit?.clickId,
      vidRaw: event.visit?.vidRaw,
      affRaw: event.visit?.affRaw,
      phoneMasked: this.maskPhone(event.visit?.phone),
      country: event.visit?.country,
      operator: event.visit?.operator,
      pageType: event.visit?.pageType,
      eventType: event.eventType,
      status: event.visit?.visitStatus,
      ip: event.visit?.ipAddress,
      userAgent: event.visit?.userAgent,
      timestamp: event.createdAt.toISOString(),
    }));

    return { total, page, size, items };
  }

  private async aggregationsFromDb(
    params: LogSearchParams,
    interval: 'hour' | 'day' = 'day',
    timeZone: string = 'UTC',
  ): Promise<Record<string, unknown>> {
    const buildBaseQuery = (selectKey: string, alias: string = 'groupKey') => {
      const qb = this.dataSource
        .getRepository(VisitEvent)
        .createQueryBuilder('event')
        .leftJoin('event.visit', 'visit')
        .select(selectKey, alias)
        .addSelect('COUNT(event.id)', 'count');
      this.applyDbFilters(qb, params);
      return qb;
    };

    // 1. byEventType
    const byEventTypeRaw = await buildBaseQuery('event.eventType')
      .groupBy('event.eventType')
      .orderBy('count', 'DESC')
      .limit(30)
      .getRawMany();

    // 2. byVendor
    const byVendorRaw = await buildBaseQuery('visit.vendorId')
      .groupBy('visit.vendorId')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    // 3. byAffiliate
    const byAffiliateRaw = await buildBaseQuery('visit.affiliateId')
      .groupBy('visit.affiliateId')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    // 4. byStatus
    const byStatusRaw = await buildBaseQuery('visit.visitStatus')
      .groupBy('visit.visitStatus')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    // 5. timeSeries — bucket in the caller's timezone when possible
    const dbType = this.dataSource.options.type as any;
    const offset = this.getUtcOffsetString(timeZone);
    let dateSelect: string;
    if (dbType === 'postgres') {
      const fmt = interval === 'hour' ? 'YYYY-MM-DD"T"HH24:00:00' : 'YYYY-MM-DD';
      dateSelect = `TO_CHAR(timezone('${timeZone.replace(/'/g, "''")}', event.createdAt AT TIME ZONE 'UTC'), '${fmt}')`;
    } else if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
      const fmt = interval === 'hour' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%d';
      dateSelect = `strftime('${fmt}', event.createdAt)`;
    } else {
      // MySQL / MariaDB
      const fmt = interval === 'hour' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%d';
      dateSelect = `DATE_FORMAT(CONVERT_TZ(event.createdAt, '+00:00', '${offset}'), '${fmt}')`;
    }
    const timeSeriesRaw = await buildBaseQuery(dateSelect)
      .groupBy('groupKey')
      .orderBy('groupKey', 'ASC')
      .getRawMany();

    const formatBuckets = (rawList: any[]) =>
      rawList.map((row) => ({
        key: row.groupKey === null ? 'null' : String(row.groupKey),
        count: Number(row.count),
      }));

    return {
      enabled: true,
      interval,
      timeSeries: formatBuckets(timeSeriesRaw),
      byEventType: formatBuckets(byEventTypeRaw),
      byVendor: formatBuckets(byVendorRaw),
      byAffiliate: formatBuckets(byAffiliateRaw),
      byStatus: formatBuckets(byStatusRaw),
    };
  }
}

