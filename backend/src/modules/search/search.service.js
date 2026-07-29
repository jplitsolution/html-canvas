import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { DataSource, Brackets } from 'typeorm';
import { VisitEvent } from '../analytics/entities/visit-event.entity';

@Injectable()
export class SearchService {
  logger = new Logger(SearchService.name);
  client = null;
  connectionFailed = false;

  constructor(
    @Inject(ConfigService) configService,
    @Inject(DataSource) dataSource,
  ) {
    this.configService = configService;
    this.dataSource = dataSource;
    this.enabled = Boolean(this.configService.get('search.enabled'));
    this.index =
      this.configService.get('search.index') || 'campaign_events';
    const node = this.configService.get('search.node');
    if (this.enabled && node) {
      this.client = new Client({ node });
    }
  }

  isEnabled() {
    return true;
  }

  async onModuleInit() {
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
        `Elasticsearch init failed (continuing with database fallback): ${err.message}`,
      );
    }
  }

  async ensureIndex() {
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

  async indexEvent(doc) {
    if (!this.client || this.connectionFailed) return;
    try {
      await this.client.index({ index: this.index, document: doc });
    } catch (err) {
      this.logger.warn(`indexEvent failed: ${err.message}`);
    }
  }

  async bulkIndex(docs) {
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

  escapeWildcard(value) {
    return value.replace(/([\\*?])/g, '\\$1');
  }

  zonedDayBound(dateStr, timeZone, bound) {
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

      const num = (type) =>
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

  resolveRangeBounds(params) {
    const tz = params.timezone || 'UTC';
    return {
      from: params.from ? this.zonedDayBound(params.from, tz, 'start') : undefined,
      to: params.to ? this.zonedDayBound(params.to, tz, 'end') : undefined,
    };
  }

  buildQuery(params) {
    const filter = [];
    if (params.campaignId !== undefined) {
      if (Array.isArray(params.campaignId)) {
        if (params.campaignId.length > 0) {
          filter.push({ terms: { campaignId: params.campaignId } });
        } else {
          filter.push({ terms: { campaignId: [-1] } });
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
      const range = {};
      if (from) range.gte = from.toISOString();
      if (to) range.lte = to.toISOString();
      filter.push({ range: { timestamp: range } });
    }
    const must = [];
    if (params.q) {
      const escaped = this.escapeWildcard(params.q);
      const keywordFields = [
        'clickId',
        'vidRaw',
        'affRaw',
        'phoneMasked',
        'ip',
      ];
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

  async search(params) {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(200, Math.max(1, params.size || 25));

    if (this.client && !this.connectionFailed) {
      try {
        const res = await this.client.search({
          index: this.index,
          from: (page - 1) * size,
          size,
          sort: [{ timestamp: { order: 'desc' } }],
          query: this.buildQuery(params),
        });
        const totalValue =
          typeof res.hits.total === 'number'
            ? res.hits.total
            : res.hits.total?.value || 0;
        return {
          total: totalValue,
          page,
          size,
          items: res.hits.hits.map((h) => h._source),
        };
      } catch (err) {
        this.connectionFailed = true;
        this.logger.warn(
          `Elasticsearch search failed, falling back to SQL database: ${err.message}`,
        );
      }
    }

    return this.searchFromDb(params);
  }

  resolveInterval(params) {
    if (params.interval === 'hour' || params.interval === 'day') {
      return params.interval;
    }
    if (params.from && params.to && params.from === params.to) return 'hour';
    return 'day';
  }

  getUtcOffsetString(timeZone, at = new Date()) {
    try {
      for (const name of ['longOffset', 'shortOffset']) {
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

  async aggregations(params) {
    const interval = this.resolveInterval(params);
    let timeZone = params.timezone || 'UTC';
    if (timeZone === 'Asia/Calcutta') {
      timeZone = 'Asia/Kolkata';
    }

    if (this.client && !this.connectionFailed) {
      try {
        const res = await this.client.search({
          index: this.index,
          size: 0,
          query: this.buildQuery(params),
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
        const aggs = res.aggregations || {};
        const buckets = (key) =>
          (aggs[key]?.buckets || []).map((b) => ({
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
          `Elasticsearch aggregations failed, falling back to SQL database: ${err.message}`,
        );
      }
    }

    return this.aggregationsFromDb(params, interval, timeZone);
  }

  applyDbFilters(queryBuilder, params) {
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
      const dbQuery = params.q.replace(/\*/g, '_');
      const searchLike = `%${dbQuery}%`;
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

  maskPhone(phone) {
    if (!phone) return undefined;
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  }

  async searchFromDb(params) {
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

    const items = events.map((event) => ({
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

  async aggregationsFromDb(
    params,
    interval = 'day',
    timeZone = 'UTC',
  ) {
    const buildBaseQuery = (selectKey, alias = 'groupkey') => {
      const qb = this.dataSource
        .getRepository(VisitEvent)
        .createQueryBuilder('event')
        .leftJoin('event.visit', 'visit')
        .select(selectKey, alias)
        .addSelect('COUNT(event.id)', 'count');
      this.applyDbFilters(qb, params);
      return qb;
    };

    const byEventTypeRaw = await buildBaseQuery('event.eventType')
      .groupBy('event.eventType')
      .orderBy('count', 'DESC')
      .limit(30)
      .getRawMany();

    const byVendorRaw = await buildBaseQuery('visit.vendorId')
      .groupBy('visit.vendorId')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    const byAffiliateRaw = await buildBaseQuery('visit.affiliateId')
      .groupBy('visit.affiliateId')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    const byStatusRaw = await buildBaseQuery('visit.visitStatus')
      .groupBy('visit.visitStatus')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    const dbType = this.dataSource.options.type;
    const offset = this.getUtcOffsetString(timeZone);
    let dateSelect;
    if (dbType === 'postgres') {
      const fmt = interval === 'hour' ? 'YYYY-MM-DD"T"HH24:00:00' : 'YYYY-MM-DD';
      dateSelect = `TO_CHAR(timezone('${timeZone.replace(/'/g, "''")}', event.createdAt AT TIME ZONE 'UTC'), '${fmt}')`;
    } else if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
      const fmt = interval === 'hour' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%d';
      dateSelect = `strftime('${fmt}', event.createdAt)`;
    } else {
      const fmt = interval === 'hour' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%d';
      dateSelect = `DATE_FORMAT(CONVERT_TZ(event.createdAt, '+00:00', '${offset}'), '${fmt}')`;
    }
    const timeSeriesRaw = await buildBaseQuery(dateSelect)
      .groupBy('groupkey')
      .orderBy('groupkey', 'ASC')
      .getRawMany();

    const formatBuckets = (rawList) =>
      rawList.map((row) => ({
        key: row.groupkey === null ? 'null' : String(row.groupkey),
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
