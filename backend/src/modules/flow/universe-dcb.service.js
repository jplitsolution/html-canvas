import { getRepository } from '../../database/index.js';
import { ApiConfig } from '../../database/entities/api-config.entity.js';
import { ApiCallType } from '../../database/entities/api-call-log.entity.js';
import { Visit } from '../../database/entities/visit.entity.js';
import { redisService } from '../../common/services/redis.service.js';
import { flowEngineService } from './flow-engine.service.js';
import { flowService } from './flow.service.js';
import { apiCallLogService } from './api-call-log.service.js';
import { universeDcbProvider } from './universe-dcb.provider.js';
import {
  DCB_OUTCOMES,
  getNestedValue,
  normalizeUniverseDcbResponse,
} from './helpers/universe-dcb-normalizer.js';
import { buildUniverseDcbLogRecord } from './helpers/universe-dcb-log.js';

const localCorrelations = new Map();
const localConfirmLocks = new Set();

const httpError = (message, statusCode, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

const parseConfig = (raw) => {
  if (!raw)
    throw httpError(
      'Universe DCB is not configured',
      503,
      'DCB_NOT_CONFIGURED',
    );
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    if (parsed.enabled === false) {
      throw httpError('Universe DCB is disabled', 503, 'DCB_NOT_CONFIGURED');
    }
    return parsed;
  } catch (err) {
    if (err.code === 'DCB_NOT_CONFIGURED') throw err;
    throw httpError(
      'Universe DCB configuration is invalid',
      503,
      'DCB_CONFIG_INVALID',
    );
  }
};

const cleanPhone = (value) => String(value || '').replace(/\D/g, '');

const stripProviderRequestIds = (value) => {
  if (Array.isArray(value)) return value.map(stripProviderRequestIds);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) => !['requestid', 'request_id'].includes(key.toLowerCase()),
      )
      .map(([key, nested]) => [key, stripProviderRequestIds(nested)]),
  );
};

export const createUniverseDcbService = (
  provider = universeDcbProvider,
  callLogger = apiCallLogService,
) => {
  const loadContext = async (input, options = {}) => {
    const campaign = await flowService.resolveCampaign(input);
    if (!campaign) {
      throw httpError(
        `No campaign found for ${input.country || ''} / ${input.operator || ''}`,
        404,
        'CAMPAIGN_NOT_FOUND',
      );
    }
    if (!campaign.active) {
      throw httpError('This offer is not available', 403, 'CAMPAIGN_INACTIVE');
    }
    if (
      flowEngineService.normalizeMode(campaign.verificationMode) !==
      'UNIVERSE_DCB'
    ) {
      throw httpError(
        'Campaign is not configured for Universe DCB',
        409,
        'DCB_MODE_REQUIRED',
      );
    }
    const apiConfig = await getRepository(ApiConfig).findOne({
      where: { campaignId: campaign.id },
    });
    const config = parseConfig(apiConfig?.dcbConfigJson);
    const msisdn = cleanPhone(input.msisdn || input.phone);
    if (options.requireMsisdn && !msisdn) {
      throw httpError('MSISDN is required', 400, 'MSISDN_REQUIRED');
    }
    const visitId = Number(input.visitId);
    if (options.requireVisit && (!visitId || Number.isNaN(visitId))) {
      throw httpError('Visit ID is required', 400, 'VISIT_REQUIRED');
    }
    let visit = null;
    if (visitId) {
      visit = await getRepository(Visit).findOne({
        where: { id: visitId },
      });
      if (
        !visit ||
        (visit.campaignId &&
          Number(visit.campaignId) !== Number(campaign.id)) ||
        (visit.phone && msisdn && cleanPhone(visit.phone) !== msisdn)
      ) {
        throw httpError(
          'Visit does not match this campaign and MSISDN',
          403,
          'DCB_VISIT_MISMATCH',
        );
      }
    }
    const rawChannel = String(input.transactionChannel || '').trim();
    const transactionChannel =
      rawChannel.toUpperCase() === 'HE'
        ? 'HE'
        : rawChannel.toLowerCase() === 'wifi'
          ? 'Wifi'
          : '';
    return {
      campaign,
      config,
      msisdn,
      visitId: visitId || null,
      visit,
      source: String(input.dcbSource || input.source || '').trim(),
      serviceId: String(
        input.serviceId || config.serviceId || campaign.serviceId || '',
      ).trim(),
      purchaseTypeId: String(input.purchaseTypeId || '').trim(),
      transactionChannel,
    };
  };

  const correlationKey = (campaignId, input, msisdn) => {
    return `dcb:pending:${campaignId}:${Number(input.visitId)}:${msisdn}`;
  };

  const saveCorrelation = async (
    key,
    providerRequestId,
    purchaseTypeId,
    ttlSeconds,
  ) => {
    if (!providerRequestId) return;
    const ttl = Math.max(60, Number(ttlSeconds) || 600);
    const value = { providerRequestId, purchaseTypeId };
    localCorrelations.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    await redisService.set(key, value, ttl);
  };

  const loadCorrelation = async (key) => {
    const cached = await redisService.get(key);
    if (cached?.providerRequestId) return cached;
    const local = localCorrelations.get(key);
    if (!local) return null;
    if (local.expiresAt <= Date.now()) {
      localCorrelations.delete(key);
      return null;
    }
    return local.value.providerRequestId ? local.value : null;
  };

  const clearCorrelation = async (key) => {
    localCorrelations.delete(key);
    await redisService.del(key);
  };

  const providerInput = (ctx) => ({
    msisdn: ctx.msisdn,
    serviceId: ctx.serviceId,
    purchaseTypeId: ctx.purchaseTypeId,
    transactionChannel: ctx.transactionChannel,
  });

  const normalize = (response, ctx) =>
    normalizeUniverseDcbResponse(response.data, ctx.config, {
      serviceId: ctx.serviceId,
    });

  const callProvider = async ({
    ctx,
    callType,
    action,
    execute,
    statusLabel,
  }) => {
    let response;
    try {
      response = await execute();
      let resolvedStatus = statusLabel;
      if (typeof statusLabel === 'function') {
        try {
          resolvedStatus = statusLabel(response);
        } catch {
          resolvedStatus = 'PARSE_ERROR';
        }
      }
      try {
        await callLogger.record(
          buildUniverseDcbLogRecord({
            ctx,
            callType,
            action,
            response,
            statusLabel: resolvedStatus,
          }),
        );
      } catch (logError) {
        console.warn(`Universe DCB API log write failed: ${logError.message}`);
      }
      return response;
    } catch (error) {
      try {
        await callLogger.record(
          buildUniverseDcbLogRecord({
            ctx,
            callType,
            action,
            error,
            statusLabel: 'FAILED',
          }),
        );
      } catch (logError) {
        console.warn(`Universe DCB API log write failed: ${logError.message}`);
      }
      throw error;
    }
  };

  const getPublicConfig = async (input) => {
    const ctx = await loadContext(input);
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_CONFIG,
      action: 'config',
      execute: () =>
        provider.getPublicConfig(ctx.config, providerInput(ctx)),
      statusLabel: 'SUCCESS',
    });
    const envelopePath = ctx.config.responsePaths?.envelope;
    const providerConfig = envelopePath
      ? getNestedValue(response.data, envelopePath)
      : response.data;
    const safeProviderConfig = stripProviderRequestIds(providerConfig);
    if (!Array.isArray(safeProviderConfig?.purchaseTypes)) {
      throw httpError(
        'Universe DCB public configuration is malformed',
        502,
        'DCB_PUBLIC_CONFIG_INVALID',
      );
    }
    const providerPurchaseTypes = safeProviderConfig.purchaseTypes;
    const providerById = new Map(
      providerPurchaseTypes.map((item) => [String(item?.id ?? ''), item]),
    );
    const configuredMappings = Array.isArray(ctx.config.purchaseTypeMappings)
      ? ctx.config.purchaseTypeMappings
      : [];
    const purchaseTypeMappings = configuredMappings
      .filter((mapping) =>
        providerById.has(String(mapping?.purchaseTypeId ?? '')),
      )
      .map((mapping) => ({
        ...mapping,
        purchaseTypeId: String(mapping.purchaseTypeId),
        code: providerById.get(String(mapping.purchaseTypeId))?.code,
      }));
    return {
      ...(safeProviderConfig &&
      typeof safeProviderConfig === 'object' &&
      !Array.isArray(safeProviderConfig)
        ? safeProviderConfig
        : { providerConfig: safeProviderConfig }),
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      merchantId: ctx.config.merchantId,
      operatorCode: ctx.config.operatorCode,
      purchaseTypeMappings,
      pollIntervalMs: ctx.config.pollIntervalMs,
      pollTimeoutMs: ctx.config.pollTimeoutMs,
    };
  };

  const getRuntimeConfig = async (input) => {
    const ctx = await loadContext(input);
    return {
      serviceId: ctx.serviceId,
      pollIntervalMs: Math.max(250, Number(ctx.config.pollIntervalMs) || 2000),
      pollTimeoutMs: Math.max(1000, Number(ctx.config.pollTimeoutMs) || 60000),
      purchaseTypeMappings: Array.isArray(ctx.config.purchaseTypeMappings)
        ? ctx.config.purchaseTypeMappings
        : [],
    };
  };

  const status = async (input) => {
    const ctx = await loadContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    // Deliberately no subscription cache: status is authoritative and always fresh.
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_SUBSCRIPTIONS,
      action: 'subscriptions',
      execute: () =>
        provider.getSubscriptions(ctx.config, providerInput(ctx)),
      statusLabel: (providerResponse) =>
        normalize(providerResponse, ctx).outcome,
    });
    return {
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      ...normalize(response, ctx),
    };
  };

  const manualCheck = async (input) => {
    const ctx = await loadContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_SUBSCRIPTIONS,
      action: 'manual-check',
      execute: () =>
        provider.getSubscriptions(ctx.config, providerInput(ctx)),
      statusLabel: (providerResponse) =>
        normalize(providerResponse, ctx).outcome,
    });
    const result = normalize(response, ctx);
    if (result.outcome !== DCB_OUTCOMES.ENTITLED) {
      return {
        campaignId: ctx.campaign.id,
        serviceId: ctx.serviceId,
        ...result,
        ...(result.outcome === DCB_OUTCOMES.NEW
          ? { stage: 'PLAN_SELECT' }
          : {}),
      };
    }
    return {
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      ...result,
      nextPage: 'OTP',
      stage: 'AUTH_OTP',
      authorization: 'PARTNER_OTP',
      message: 'Enter the authorization OTP sent to this number.',
      flowContext: {
        provider: 'UNIVERSE_DCB',
        verificationMode: 'UNIVERSE_DCB',
        stage: 'AUTH_OTP',
        authorization: 'PARTNER_OTP',
        outcome: result.outcome,
        status: result.status,
      },
    };
  };

  const requestPincode = async (input) => {
    const ctx = await loadContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    if (!ctx.purchaseTypeId) {
      throw httpError(
        'Purchase type is required',
        400,
        'PURCHASE_TYPE_REQUIRED',
      );
    }
    if (!ctx.transactionChannel) {
      throw httpError(
        'Transaction channel must be HE or Wifi',
        400,
        'TRANSACTION_CHANNEL_REQUIRED',
      );
    }
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_PINCODE,
      action: 'pincode',
      execute: () =>
        provider.requestPincode(ctx.config, providerInput(ctx)),
      statusLabel: 'PIN_REQUIRED',
    });
    if (!response.providerRequestId) {
      throw httpError(
        'Universe DCB pincode response did not include a request ID',
        502,
        'DCB_PROVIDER_REQUEST_ID_MISSING',
      );
    }
    await saveCorrelation(
      correlationKey(ctx.campaign.id, input, ctx.msisdn),
      response.providerRequestId,
      ctx.purchaseTypeId,
      ctx.config.correlationTtlSeconds,
    );
    return {
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      outcome: DCB_OUTCOMES.PENDING,
      stage: 'PIN_REQUIRED',
    };
  };

  const confirm = async (input) => {
    const ctx = await loadContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    const pin = String(input.pin || input.pincode || '').trim();
    if (!pin) throw httpError('PIN is required', 400, 'PIN_REQUIRED');
    const key = correlationKey(ctx.campaign.id, input, ctx.msisdn);
    const correlation = await loadCorrelation(key);
    if (!correlation) {
      throw httpError(
        'PIN request correlation is missing or expired',
        409,
        'DCB_CORRELATION_REQUIRED',
      );
    }
    if (
      ctx.purchaseTypeId &&
      String(correlation.purchaseTypeId) !== ctx.purchaseTypeId
    ) {
      throw httpError(
        'PIN request does not match the selected purchase type',
        409,
        'DCB_CORRELATION_MISMATCH',
      );
    }
    const lockKey = `${key}:confirm`;
    if (localConfirmLocks.has(lockKey)) {
      throw httpError(
        'PIN confirmation is already in progress',
        409,
        'DCB_CONFIRM_IN_PROGRESS',
      );
    }
    const lockAcquired = await redisService.setNx(lockKey, '1', 30);
    if (!lockAcquired) {
      throw httpError(
        'PIN confirmation is already in progress',
        409,
        'DCB_CONFIRM_IN_PROGRESS',
      );
    }
    localConfirmLocks.add(lockKey);
    try {
      await callProvider({
        ctx: {
          ...ctx,
          purchaseTypeId: String(correlation.purchaseTypeId || ''),
        },
        callType: ApiCallType.DCB_CONFIRM,
        action: 'confirm',
        execute: () =>
          provider.confirm(ctx.config, {
            ...providerInput(ctx),
            purchaseTypeId: correlation.purchaseTypeId,
            providerRequestId: correlation.providerRequestId,
            pin,
          }),
        statusLabel: 'POLLING',
      });
      await clearCorrelation(key);
      return {
        campaignId: ctx.campaign.id,
        serviceId: ctx.serviceId,
        outcome: DCB_OUTCOMES.PENDING,
        status: null,
        stage: 'POLLING',
      };
    } catch (err) {
      await redisService.del(lockKey);
      throw err;
    } finally {
      localConfirmLocks.delete(lockKey);
    }
  };

  return {
    getPublicConfig,
    getRuntimeConfig,
    manualCheck,
    requestPincode,
    confirm,
    status,
  };
};

export const universeDcbService = createUniverseDcbService();
