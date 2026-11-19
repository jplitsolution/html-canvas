/**
 * Delayed Checksub Worker
 *
 * Runs as a cron job every 1 minute.
 * Processes conversion_postbacks with delayed_checksub_status = 'pending'
 * whose delayed_checksub_scheduled_at has elapsed, calling Orange BF checksub
 * and updating the postback row with the partner's response.
 */

import { LessThanOrEqual } from 'typeorm';
import { getRepository } from '../../database/index.js';
import { ConversionPostback } from '../../database/entities/conversion-postback.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { redisService } from '../../common/services/redis.service.js';
import { orangeBfProvider, ORANGE_BF_DEFAULTS } from './orange-bf.provider.js';
import { universeDcbProvider } from './universe-dcb.provider.js';
import { DCB_OUTCOMES, normalizeUniverseDcbResponse } from './helpers/universe-dcb-normalizer.js';
import { partnerApiService } from './partner-api.service.js';
import { apiCallLogService } from './api-call-log.service.js';
import { analyticsService } from '../analytics/analytics.service.js';
import {
  interpretChecksubResponse,
  isActiveSubscriberStatus,
} from './helpers/checksub-rules.js';
import { CronJob } from 'cron';

// ─── constants ───────────────────────────────────────────────────────────────

const BATCH_LIMIT = 20;
const LOCK_TTL_SECONDS = 30;
const LOG_PREFIX = '[DelayedChecksub]';

// ─── helpers ─────────────────────────────────────────────────────────────────

const safeParseJson = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Classify operator checksub status.
 * Per business requirement:
 * Only 'ACTIVE' (or equivalent success indicators) is considered a success.
 * 'GRACE', 'PARKING', 'PENDING', 'SUSPENDED', etc. are recorded as non-success.
 */
export const classifyChecksubStatus = (rawStatus) => {
  const s = String(rawStatus || '').trim().toUpperCase();
  if (
    isActiveSubscriberStatus(s) ||
    s === 'ACTIVE' ||
    s === 'ACT' ||
    s === '1' ||
    s === 'SUBSCRIBED' ||
    s === 'SUCCESS' ||
    s === 'ENTITLED' ||
    s === 'TRIAL_ACTIVE'
  ) {
    return {
      statusLabel: 'ACTIVE',
      isSuccess: true,
    };
  }
  if (s.includes('GRACE')) {
    return {
      statusLabel: 'GRACE',
      isSuccess: false,
    };
  }
  if (s.includes('PARK') || s.includes('LOW_BALANCE')) {
    return {
      statusLabel: 'PARKING',
      isSuccess: false,
    };
  }
  if (s.includes('PENDING') || s.includes('WAITING')) {
    return {
      statusLabel: 'PENDING',
      isSuccess: false,
    };
  }
  if (s.includes('SUSPEND')) {
    return {
      statusLabel: 'SUSPENDED',
      isSuccess: false,
    };
  }
  return {
    statusLabel: s || 'FAILED',
    isSuccess: false,
  };
};

const getDcbEndpointUrl = (baseUrl, path = '/api/dcb/subscriptions') => {
  const base = String(baseUrl || '').trim();
  if (!base) return path;
  try {
    return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
  } catch {
    return `${base}${path}`;
  }
};

/**
 * Load ApiConfig for a campaign and extract the fields needed for
 * orangeBfProvider.checkSubscription(), mirroring the parseProviderConfig
 * logic in orange-bf.service.js lines 167-238.
 */
const loadProviderConfig = async (campaignId) => {
  try {
    const apiConfig = await getRepository(ApiConfig).findOne({
      where: { campaignId: parseInt(campaignId, 10) },
    });

    if (!apiConfig) return { ...ORANGE_BF_DEFAULTS };

    const headersParsed = safeParseJson(apiConfig.headersJson);
    const otpConfigParsed = safeParseJson(apiConfig.otpConfigJson);
    const merged = { ...headersParsed, ...otpConfigParsed };

    let baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
    if (merged.baseUrl) {
      baseUrl = merged.baseUrl;
    } else if (apiConfig.sendUrl) {
      try {
        baseUrl = new URL(apiConfig.sendUrl).origin;
      } catch {
        baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
      }
    }

    return {
      baseUrl,
      checksubUrl: merged.checksubUrl || apiConfig.subscriptionApi || null,
      checksubMethod: (merged.checksubMethod || 'GET').toUpperCase(),
      checksubBodyJson: merged.checksubBodyJson || null,
      checksubHeadersJson:
        merged.checksubHeadersJson || merged.headersJson || apiConfig.headersJson || null,
      checksubConfigJson: apiConfig.checksubConfigJson || null,
      serviceId: merged.serviceId || ORANGE_BF_DEFAULTS.serviceId,
      subServiceId: merged.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
      cpId: merged.cpId || ORANGE_BF_DEFAULTS.cpId,
      channel: merged.channel || ORANGE_BF_DEFAULTS.channel,
      country: merged.country || ORANGE_BF_DEFAULTS.country,
      operator: merged.operator || ORANGE_BF_DEFAULTS.operator,
      timeoutMs: Number(merged.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs,
    };
  } catch (err) {
    console.warn(`${LOG_PREFIX} loadProviderConfig error (campaignId=${campaignId}):`, err.message);
    return { ...ORANGE_BF_DEFAULTS };
  }
};

// ─── core processing ─────────────────────────────────────────────────────────

/**
 * Process a single pending postback row.
 */
const processRow = async (postback, { force = false } = {}) => {
  const { id, msisdn, campaignId } = postback;
  const lockKey = `checksub:delayed:lock:${msisdn}`;

  // Acquire distributed Redis lock (30 s TTL) to avoid duplicate processing
  let lockAcquired = false;
  try {
    lockAcquired = await redisService.setNx(lockKey, String(id), LOCK_TTL_SECONDS);
  } catch (redisErr) {
    console.warn(`${LOG_PREFIX} Redis setNx failed for msisdn=${msisdn}:`, redisErr.message);
    return; // Skip — cannot safely acquire lock
  }

  if (!lockAcquired) {
    console.log(`${LOG_PREFIX} Lock not acquired for msisdn=${msisdn} (another worker active) — skipping.`);
    return;
  }

  try {
    // Re-fetch the row inside the lock to guard against race conditions
    const repo = getRepository(ConversionPostback);
    const fresh = await repo.findOne({ where: { id } });

    if (!fresh) {
      console.warn(`${LOG_PREFIX} Postback id=${id} not found — skipping.`);
      return;
    }

    if (!force && fresh.delayedChecksubStatus !== 'pending' && fresh.delayedChecksubStatus !== null) {
      console.log(
        `${LOG_PREFIX} Postback id=${id} status is '${fresh.delayedChecksubStatus}' (already processed) — skipping.`,
      );
      return;
    }

    // Determine campaign verification mode
    const campaign = campaignId
      ? await getRepository(Campaign).findOne({ where: { id: parseInt(campaignId, 10) } })
      : null;
    const apiConfig = campaignId
      ? await getRepository(ApiConfig).findOne({ where: { campaignId: parseInt(campaignId, 10) } })
      : null;

    const vMode = String(campaign?.verificationMode || '').toUpperCase();
    const isOrangeBf = vMode === 'ORANGE_BF';
    const isUniverseDcb = vMode === 'UNIVERSE_DCB';

    let checkResult = null;
    let rawResponse = {};
    let rawStatusValue = '';
    const callType = ApiCallType.DELAYED_CHECKSUB;
    const httpTrace = {
      method: 'GET',
      requestUrl: '',
      requestBody: null,
      httpStatus: null,
      responseBody: null,
      errorMessage: null,
    };

    if (isOrangeBf) {
      const config = await loadProviderConfig(campaignId);
      console.log(`${LOG_PREFIX} Calling Orange BF checkSubscription for postback id=${id}, msisdn=${msisdn}`);
      checkResult = await orangeBfProvider.checkSubscription({
        msisdn,
        serviceId: config.serviceId,
        subServiceId: config.subServiceId,
        cpId: config.cpId,
        channel: config.channel,
        country: config.country,
        operator: config.operator,
        context: {
          campaignId: campaignId ? String(campaignId) : '',
          visitId: String(fresh.visitId || ''),
        },
        config,
      });
      httpTrace.method = config.checksubMethod || 'GET';
      httpTrace.requestUrl = checkResult.requestUrl || '';
      httpTrace.requestBody =
        checkResult.requestBody || checkResult.requestParams || { msisdn };
      httpTrace.httpStatus = checkResult.httpStatus ?? null;
      httpTrace.responseBody = checkResult.rawResponse ?? {};
      httpTrace.errorMessage = checkResult.success
        ? null
        : checkResult.error || checkResult.responseMessage || null;
      rawResponse = httpTrace.responseBody;
      const interpreted = interpretChecksubResponse(rawResponse, config.checksubConfigJson);
      rawStatusValue = interpreted?.status || checkResult.outcome || '';
    } else if (isUniverseDcb && apiConfig?.dcbConfigJson) {
      console.log(`${LOG_PREFIX} Calling Universe DCB getSubscriptions for postback id=${id}, msisdn=${msisdn}`);
      const dcbConfig = safeParseJson(apiConfig.dcbConfigJson);
      try {
        const dcbResp = await universeDcbProvider.getSubscriptions(dcbConfig, {
          msisdn,
          serviceId: campaign?.serviceId || dcbConfig.serviceId,
        });
        httpTrace.method = dcbResp.logMeta?.method || 'GET';
        httpTrace.requestUrl =
          dcbResp.logMeta?.url || getDcbEndpointUrl(dcbConfig.baseUrl, '/api/dcb/subscriptions');
        httpTrace.requestBody = dcbResp.requestBody || dcbResp.logMeta?.requestBody || { msisdn };
        httpTrace.httpStatus = dcbResp.status || 200;
        httpTrace.responseBody = dcbResp.data || {};
        rawResponse = httpTrace.responseBody;
        const normalized = normalizeUniverseDcbResponse(rawResponse, dcbConfig, {
          serviceId: campaign?.serviceId || dcbConfig.serviceId,
        });
        rawStatusValue =
          normalized?.outcome === DCB_OUTCOMES.ENTITLED
            ? 'ACTIVE'
            : (normalized?.status || normalized?.outcome || '');
        checkResult = {
          success: Boolean(rawStatusValue && rawStatusValue !== 'TERMINAL_FAILURE' && rawStatusValue !== 'PARSE_ERROR'),
          httpStatus: httpTrace.httpStatus,
          outcome: rawStatusValue,
          rawResponse,
        };
      } catch (dcbErr) {
        console.warn(`${LOG_PREFIX} Universe DCB checksub error:`, dcbErr.message);
        httpTrace.method = dcbErr.logMeta?.method || 'GET';
        httpTrace.requestUrl =
          dcbErr.logMeta?.url || getDcbEndpointUrl(dcbConfig.baseUrl, '/api/dcb/subscriptions');
        httpTrace.requestBody = dcbErr.logMeta?.requestBody || { msisdn };
        httpTrace.httpStatus = dcbErr.providerStatus || 500;
        httpTrace.responseBody = dcbErr.providerData || { error: dcbErr.message };
        httpTrace.errorMessage = dcbErr.message;
        rawResponse = httpTrace.responseBody;
        rawStatusValue = dcbErr.operatorMessage || dcbErr.code || 'FAILED';
        checkResult = {
          success: false,
          httpStatus: httpTrace.httpStatus,
          outcome: rawStatusValue,
          rawResponse,
          errorMessage: dcbErr.message,
        };
      }
    } else if (apiConfig?.subscriptionApi) {
      console.log(`${LOG_PREFIX} Calling partnerApiService.checkSubscription for postback id=${id}, msisdn=${msisdn}`);
      const checkOutcome = await partnerApiService.checkSubscription(apiConfig, {
        phone: msisdn,
        msisdn,
        visitId: fresh.visitId,
        campaignId,
        country: campaign?.country,
        operator: campaign?.operator,
        serviceId: campaign?.serviceId,
        skipCache: true,
        skipLog: true,
      });
      httpTrace.method = checkOutcome.requestMethod || 'GET';
      httpTrace.requestUrl = checkOutcome.requestUrl || apiConfig.subscriptionApi;
      httpTrace.requestBody = checkOutcome.requestBody || { msisdn };
      httpTrace.httpStatus = checkOutcome.httpStatus ?? null;
      httpTrace.responseBody =
        checkOutcome.rawResponse ?? { status: checkOutcome.status || 'unknown' };
      httpTrace.errorMessage = checkOutcome.errorMessage || null;
      rawResponse = httpTrace.responseBody;
      rawStatusValue = checkOutcome.status || (checkOutcome.isActive ? 'active' : 'inactive');
      checkResult = {
        success: Boolean(
          checkOutcome.httpStatus
            ? checkOutcome.httpStatus < 400
            : checkOutcome.status && checkOutcome.status !== 'failed',
        ),
        httpStatus: httpTrace.httpStatus,
        outcome: rawStatusValue,
        rawResponse,
        errorMessage: httpTrace.errorMessage,
      };
    } else {
      console.log(`${LOG_PREFIX} No checksub URL configured for campaign id=${campaignId} — skipping.`);
      await repo.update(
        { id },
        {
          delayedChecksubStatus: 'skipped',
          delayedChecksubExecutedAt: new Date(),
          delayedChecksubOutcome: 'no_checksub_url',
        },
      );
      return;
    }

    // Classify operator checksub status:
    // Only ACTIVE is success. GRACE, PARKING, PENDING, SUSPENDED etc. are non-success.
    const classification = classifyChecksubStatus(rawStatusValue);
    const { statusLabel, isSuccess } = classification;

    // Build update payload for conversion_postbacks
    const updatePayload = {
      delayedChecksubExecutedAt: new Date(),
      delayedChecksubResponse: JSON.stringify(rawResponse).slice(0, 2000),
      delayedChecksubStatus: isSuccess ? 'completed' : 'failed',
      delayedChecksubOutcome: statusLabel,
      operatorStatus: statusLabel,
    };

    await repo.update({ id }, updatePayload);

    // Update visits table for operator audit
    let targetVisitId = fresh.visitId;
    try {
      const visitRepo = getRepository(Visit);
      if (!targetVisitId && msisdn) {
        const v = await visitRepo.findOne({
          where: { phone: msisdn },
          order: { id: 'DESC' },
        });
        if (v?.id) targetVisitId = v.id;
      }

      if (targetVisitId) {
        await visitRepo.update(
          { id: targetVisitId },
          {
            checksubStatus: statusLabel,
            checksubExecutedAt: new Date(),
            checksubResponse: JSON.stringify(rawResponse).slice(0, 2000),
          },
        );

        try {
          await analyticsService.logEvent(
            targetVisitId,
            'CHECKSUB_30M',
            {
              source: isOrangeBf ? 'orange_bf' : isUniverseDcb ? 'universe_dcb' : 'checksub',
              phone: msisdn,
              status: statusLabel,
              success: isSuccess,
              method: httpTrace.method || 'GET',
              url: httpTrace.requestUrl || null,
              httpStatus: httpTrace.httpStatus,
              requestBody: httpTrace.requestBody,
              responseBody: httpTrace.responseBody,
              errorMessage: httpTrace.errorMessage,
            },
          );
        } catch {}
      }
    } catch (visitErr) {
      console.warn(`${LOG_PREFIX} Failed to update visit for postback id=${id}:`, visitErr.message);
    }

    console.log(
      `${LOG_PREFIX} Postback id=${id} → status=${updatePayload.delayedChecksubStatus}, outcome=${updatePayload.delayedChecksubOutcome}`,
    );

    // Log the actual partner HTTP call (URL, request, raw response).
    try {
      const requestPayload =
        httpTrace.requestBody && typeof httpTrace.requestBody === 'object'
          ? { ...httpTrace.requestBody, isDelayedChecksub: true }
          : {
              body: httpTrace.requestBody ?? null,
              msisdn,
              isDelayedChecksub: true,
            };

      await apiCallLogService.record({
        visitId: targetVisitId || null,
        vendorId: fresh.vendorId || null,
        campaignId: campaignId ? parseInt(campaignId, 10) : null,
        msisdn,
        callType,
        requestUrl: httpTrace.requestUrl || null,
        requestBody: JSON.stringify(requestPayload),
        responseStatus: httpTrace.httpStatus ?? checkResult?.httpStatus ?? null,
        responseBody: httpTrace.responseBody,
        success: httpTrace.httpStatus != null ? httpTrace.httpStatus < 400 : Boolean(checkResult?.success),
        errorMessage: httpTrace.errorMessage,
        statusLabel,
      });
    } catch (logErr) {
      console.warn(`${LOG_PREFIX} apiCallLogService.record failed for postback id=${id}:`, logErr.message);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Error processing postback id=${id}:`, err.message);

    // Mark as failed so we don't retry indefinitely on hard errors
    try {
      await getRepository(ConversionPostback).update(
        { id },
        {
          delayedChecksubStatus: 'failed',
          delayedChecksubExecutedAt: new Date(),
          delayedChecksubOutcome: 'error',
          delayedChecksubResponse: JSON.stringify({ error: err.message }).slice(0, 2000),
        },
      );
    } catch (updateErr) {
      console.error(`${LOG_PREFIX} Failed to mark postback id=${id} as failed:`, updateErr.message);
    }
  } finally {
    // Always release the lock
    try {
      await redisService.del(lockKey);
    } catch (delErr) {
      console.warn(`${LOG_PREFIX} Failed to release lock for msisdn=${msisdn}:`, delErr.message);
    }
  }
};

/**
 * Main tick handler — fetch up to BATCH_LIMIT due pending rows and
 * process them sequentially to avoid hammering the partner API.
 */
const runTick = async () => {
  try {
    const repo = getRepository(ConversionPostback);

    // 1. Fetch scheduled pending rows that are due
    let rowsToProcess = await repo.find({
      where: {
        delayedChecksubStatus: 'pending',
        delayedChecksubScheduledAt: LessThanOrEqual(new Date()),
      },
      order: { delayedChecksubScheduledAt: 'ASC' },
      take: BATCH_LIMIT,
      select: ['id', 'msisdn', 'campaignId', 'operatorStatus', 'delayedChecksubStatus'],
    });

    // 2. Also backfill uninitialized rows whose 30 minutes have passed
    if (rowsToProcess.length < BATCH_LIMIT) {
      const remaining = BATCH_LIMIT - rowsToProcess.length;
      const uninit = await repo
        .createQueryBuilder('p')
        .where('p.delayedChecksubStatus IS NULL')
        .andWhere('p.msisdn IS NOT NULL')
        .andWhere("p.msisdn <> ''")
        .andWhere('p.createdAt <= :thirtyMinsAgo', {
          thirtyMinsAgo: new Date(Date.now() - 30 * 60 * 1000),
        })
        .orderBy('p.createdAt', 'DESC')
        .take(remaining)
        .select(['p.id', 'p.msisdn', 'p.campaignId', 'p.operatorStatus', 'p.delayedChecksubStatus'])
        .getMany();

      if (uninit.length) {
        rowsToProcess = rowsToProcess.concat(uninit);
      }
    }

    if (rowsToProcess.length === 0) return;

    console.log(`${LOG_PREFIX} Tick: found ${rowsToProcess.length} row(s) to process.`);

    // Sequential processing — avoids burst on partner APIs
    for (const row of rowsToProcess) {
      await processRow(row);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Tick error:`, err.message);
  }
};

// ─── worker lifecycle ─────────────────────────────────────────────────────────

let jobs = [];

/**
 * Start the delayed checksub cron worker (every 1 minute).
 * @returns {CronJob[]} running job array
 */
export const startDelayedChecksubWorker = () => {
  if (jobs.length > 0) return jobs;

  const job = CronJob.from({
    cronTime: '* * * * *', // every 1 minute
    timeZone: 'Asia/Kolkata',
    start: true,
    onTick: runTick,
  });

  jobs = [job];
  console.log(`${LOG_PREFIX} Worker started (every 1 minute).`);
  return jobs;
};

/**
 * Stop all running delayed checksub cron jobs.
 */
export const stopDelayedChecksubWorker = () => {
  for (const job of jobs) {
    job.stop();
  }
  jobs = [];
  console.log(`${LOG_PREFIX} Worker stopped.`);
};

// ─── schedule helper ──────────────────────────────────────────────────────────

/**
 * Schedule a delayed checksub on a postback row.
 * Called at OTP-verify time to set up the 30-minute deferred checksub.
 *
 * @param {object} opts
 * @param {number|string} [opts.postbackId]      - ConversionPostback PK (preferred)
 * @param {string}        [opts.msisdn]           - fallback lookup if postbackId absent
 * @param {number|string} [opts.campaignId]       - used with msisdn lookup
 * @param {number}        [opts.delayMinutes=30]  - delay in minutes (default 30)
 * @returns {Promise<ConversionPostback|null>}    - updated postback or null if not found
 */
export const scheduleDelayedChecksub = async ({
  postbackId,
  msisdn,
  campaignId,
  delayMinutes = 30,
} = {}) => {
  try {
    const repo = getRepository(ConversionPostback);

    let postback = null;

    if (postbackId) {
      postback = await repo.findOne({ where: { id: parseInt(postbackId, 10) } });
    } else if (msisdn && campaignId) {
      postback = await repo.findOne({
        where: { msisdn: String(msisdn), campaignId: parseInt(campaignId, 10) },
        order: { id: 'DESC' },
      });
    }

    if (!postback) {
      console.warn(
        `${LOG_PREFIX} scheduleDelayedChecksub: postback not found (postbackId=${postbackId}, msisdn=${msisdn}).`,
      );
      return null;
    }

    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await repo.update(
      { id: postback.id },
      {
        delayedChecksubStatus: 'pending',
        delayedChecksubScheduledAt: scheduledAt,
      },
    );

    console.log(
      `${LOG_PREFIX} Scheduled checksub for postback id=${postback.id} msisdn=${postback.msisdn} at ${scheduledAt.toISOString()} (+${delayMinutes}m).`,
    );

    return { ...postback, delayedChecksubStatus: 'pending', delayedChecksubScheduledAt: scheduledAt };
  } catch (err) {
    console.error(`${LOG_PREFIX} scheduleDelayedChecksub error:`, err.message);
    return null;
  }
};


/**
 * Trigger immediate checksub on a specific postback (e.g. from UI 'Run Now' button).
 */
export const runDelayedChecksubNow = async (postbackId) => {
  try {
    const repo = getRepository(ConversionPostback);
    const row = await repo.findOne({ where: { id: parseInt(postbackId, 10) } });
    if (!row) {
      return { error: 'Postback not found' };
    }
    await processRow(row, { force: true });
    const updated = await repo.findOne({ where: { id: parseInt(postbackId, 10) } });
    return {
      success: updated?.delayedChecksubStatus === 'completed',
      outcome: updated?.delayedChecksubOutcome,
      status: updated?.delayedChecksubStatus,
      operatorStatus: updated?.operatorStatus,
      executedAt: updated?.delayedChecksubExecutedAt,
    };
  } catch (err) {
    console.error(`${LOG_PREFIX} runDelayedChecksubNow error:`, err.message);
    return { error: err.message };
  }
};
