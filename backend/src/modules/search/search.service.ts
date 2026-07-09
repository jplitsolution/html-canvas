import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

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
 * Thin Elasticsearch wrapper. ES is optional: when no node is configured the
 * service is disabled and all methods no-op / return empty results so the app
 * (and the funnel) works without ES in local dev.
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Client | null = null;
  private readonly enabled: boolean;
  private readonly index: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = Boolean(this.configService.get<boolean>('search.enabled'));
    this.index =
      this.configService.get<string>('search.index') || 'campaign_events';
    const node = this.configService.get<string>('search.node');
    if (this.enabled && node) {
      this.client = new Client({ node });
    }
  }

  isEnabled(): boolean {
    return this.enabled && !!this.client;
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log('Elasticsearch disabled (ELASTICSEARCH_NODE not set).');
      return;
    }
    try {
      await this.ensureIndex();
      this.logger.log(`Elasticsearch ready. index=${this.index}`);
    } catch (err) {
      this.logger.warn(
        `Elasticsearch init failed (continuing without it): ${(err as Error).message}`,
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
    if (!this.client) return;
    try {
      await this.client.index({ index: this.index, document: doc });
    } catch (err) {
      this.logger.warn(`indexEvent failed: ${(err as Error).message}`);
    }
  }

  async bulkIndex(docs: CampaignEventDoc[]): Promise<number> {
    if (!this.client || docs.length === 0) return 0;
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
    if (!this.client) {
      return { total: 0, page, size, items: [] };
    }
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
  }

  async aggregations(params: LogSearchParams): Promise<Record<string, unknown>> {
    if (!this.client) {
      return {
        enabled: false,
        timeSeries: [],
        byEventType: [],
        byVendor: [],
        byAffiliate: [],
      };
    }
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
  }
}
