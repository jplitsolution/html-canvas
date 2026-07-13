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
  campaignId: number;
  from?: string;
  to?: string;
  eventType?: string;
  vendorId?: number;
  affiliateId?: number;
  clickId?: string;
  q?: string;
  page?: number;
  size?: number;
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

  private buildQuery(params: LogSearchParams): Record<string, unknown> {
    const filter: Array<Record<string, unknown>> = [
      { term: { campaignId: params.campaignId } },
    ];
    if (params.eventType) filter.push({ term: { eventType: params.eventType } });
    if (params.vendorId) filter.push({ term: { vendorId: params.vendorId } });
    if (params.affiliateId)
      filter.push({ term: { affiliateId: params.affiliateId } });
    if (params.clickId) filter.push({ term: { clickId: params.clickId } });
    if (params.from || params.to) {
      const range: Record<string, string> = {};
      if (params.from) range.gte = params.from;
      if (params.to) range.lte = params.to;
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

  async aggregations(params: LogSearchParams): Promise<Record<string, unknown>> {
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
                calendar_interval: 'day',
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

    return this.aggregationsFromDb(params);
  }

  private applyDbFilters(queryBuilder: any, params: LogSearchParams): void {
    queryBuilder.where('visit.campaignId = :campaignId', {
      campaignId: params.campaignId,
    });

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
    if (params.from) {
      queryBuilder.andWhere('event.createdAt >= :from', {
        from: new Date(params.from),
      });
    }
    if (params.to) {
      const toDate = new Date(params.to);
      toDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('event.createdAt <= :to', {
        to: toDate,
      });
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

  private async aggregationsFromDb(params: LogSearchParams): Promise<Record<string, unknown>> {
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

    // 5. timeSeries
    const dbType = this.dataSource.options.type as any;
    let dateSelect = "DATE_FORMAT(event.createdAt, '%Y-%m-%d')";
    if (dbType === 'postgres') {
      dateSelect = "TO_CHAR(event.createdAt, 'YYYY-MM-DD')";
    } else if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
      dateSelect = "strftime('%Y-%m-%d', event.createdAt)";
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
      timeSeries: formatBuckets(timeSeriesRaw),
      byEventType: formatBuckets(byEventTypeRaw),
      byVendor: formatBuckets(byVendorRaw),
      byAffiliate: formatBuckets(byAffiliateRaw),
      byStatus: formatBuckets(byStatusRaw),
    };
  }
}

