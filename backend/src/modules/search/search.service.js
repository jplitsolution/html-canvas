import { Client } from '@elastic/elasticsearch';
import { Brackets } from 'typeorm';
import { getDataSource, getRepository } from '../../database/index.js';
import { VisitEvent } from '../analytics/entities/visit-event.entity.js';
import getConfig from '../../config/configuration.js';

export const createSearchService = () => {
  const config = getConfig();
  const enabled = Boolean(config.search?.enabled);
  const indexName = config.search?.index || 'campaign_events';
  const node = config.search?.node;

  let client = enabled && node ? new Client({ node }) : null;
  let connectionFailed = false;

  const isEnabled = () => true;

  const escapeWildcard = (value) => {
    return value.replace(/([\\*?])/g, '\\$1');
  };

  const maskPhone = (phone) => {
    if (!phone) return undefined;
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  };

  const zonedDayBound = (dateStr, timeZone, bound) => {
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
  };

  const resolveRangeBounds = (params) => {
    const tz = params.timezone || 'UTC';
    return {
      from: params.from ? zonedDayBound(params.from, tz, 'start') : undefined,
      to: params.to ? zonedDayBound(params.to, tz, 'end') : undefined,
    };
  };

  const buildQuery = (params) => {
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
      const { from, to } = resolveRangeBounds(params);
      const range = {};
      if (from) range.gte = from.toISOString();
      if (to) range.lte = to.toISOString();
      filter.push({ range: { timestamp: range } });
    }
    const must = [];
    if (params.q) {
      const escaped = escapeWildcard(params.q);
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
  };

  const indexEvent = async (doc) => {
    if (!client || connectionFailed) return;
    try {
      await client.index({ index: indexName, document: doc });
    } catch (err) {
      console.warn(`indexEvent failed: ${err.message}`);
    }
  };

  const applyDbFilters = (queryBuilder, params) => {
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
      const { from, to } = resolveRangeBounds(params);
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
  };

  const searchFromDb = async (params) => {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(200, Math.max(1, params.size || 25));

    const queryBuilder = getRepository(VisitEvent)
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.visit', 'visit');

    applyDbFilters(queryBuilder, params);

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
      phoneMasked: maskPhone(event.visit?.phone),
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
  };

  const search = async (params) => {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(200, Math.max(1, params.size || 25));

    if (client && !connectionFailed) {
      try {
        const res = await client.search({
          index: indexName,
          from: (page - 1) * size,
          size,
          sort: [{ timestamp: { order: 'desc' } }],
          query: buildQuery(params),
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
        connectionFailed = true;
      }
    }

    return searchFromDb(params);
  };

  return {
    isEnabled,
    indexEvent,
    search,
  };
};

export const searchService = createSearchService();
