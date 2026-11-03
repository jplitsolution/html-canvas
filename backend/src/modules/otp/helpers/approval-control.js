import crypto from 'crypto';
import { redisService } from '../../../common/services/redis.service.js';
import { parsePayoutPercent } from './payout.js';

export const APPROVAL_TOLERANCE_PERCENT = Number(
  process.env.APPROVAL_TOLERANCE_PERCENT || 2,
);
export const APPROVAL_CONTROL_TTL_SECONDS = 8 * 24 * 60 * 60;

/** Atomic rate control. Ported from Ad-management postbackService. */
export const APPROVAL_CONTROL_LUA = `
local totalKey = KEYS[1]
local approvedKey = KEYS[2]
local percentageKey = KEYS[3]

local percentageArg = ARGV[1]
local toleranceArg = ARGV[2]
local bucketArg = ARGV[3]
local ttlArg = ARGV[4]

if not percentageArg then
  return redis.error_reply('percentage argument required')
end
if not toleranceArg then
  return redis.error_reply('tolerance argument required')
end
if not bucketArg then
  return redis.error_reply('bucket argument required')
end
if not ttlArg then
  return redis.error_reply('ttl argument required')
end

local percentage = tonumber(percentageArg)
local tolerance = tonumber(toleranceArg)
local bucket = tonumber(bucketArg)
local ttl = tonumber(ttlArg)

if not percentage then
  return redis.error_reply('percentage must be numeric')
end
if not tolerance then
  return redis.error_reply('tolerance must be numeric')
end
if not bucket then
  return redis.error_reply('bucket must be numeric')
end
if not ttl then
  return redis.error_reply('ttl must be numeric')
end

if percentage < 0 then percentage = 0 end
if percentage > 100 then percentage = 100 end
if tolerance < 0 then tolerance = 0 end
if bucket < 0 then bucket = 0 end
if bucket > 9999 then bucket = 9999 end

local storedPercentage = redis.call('GET', percentageKey)
if (not storedPercentage) or storedPercentage ~= percentageArg then
  redis.call('DEL', totalKey)
  redis.call('DEL', approvedKey)
  redis.call('SET', percentageKey, percentageArg, 'EX', ttl)
end

local total = redis.call('INCR', totalKey)
redis.call('EXPIRE', totalKey, ttl)
redis.call('EXPIRE', approvedKey, ttl)
redis.call('EXPIRE', percentageKey, ttl)

local approvedRaw = redis.call('GET', approvedKey)
local approved = 0
if approvedRaw then
  approved = tonumber(approvedRaw) or 0
end

local targetApproved = math.floor((percentage * total) / 100)
local maxPercent = percentage + tolerance
if maxPercent > 100 then maxPercent = 100 end
local maxAllowed = math.ceil((maxPercent * total) / 100)

local status = 'pending'
if percentage >= 100 then
  if approved < maxAllowed then
    approved = redis.call('INCR', approvedKey)
    status = 'approved'
  end
elseif percentage > 0 then
  if approved >= maxAllowed then
    status = 'pending'
  elseif approved < targetApproved then
    approved = redis.call('INCR', approvedKey)
    status = 'approved'
  else
    local threshold = math.floor((percentage * 100) + 0.5)
    if bucket < threshold and (approved + 1) <= maxAllowed then
      approved = redis.call('INCR', approvedKey)
      status = 'approved'
    end
  end
end

redis.call('EXPIRE', approvedKey, ttl)

return {
  status,
  tostring(total),
  tostring(approved),
  tostring(targetApproved),
  tostring(maxAllowed),
  tostring(percentage),
  tostring(tolerance)
}
`;

export const approvalEntityId = (campaignId, vendorId) => {
  const vid = Number(vendorId) || 0;
  return `c${campaignId}:v${vid}`;
};

export const istDateKey = (now = new Date()) => {
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
};

export const bucketFromDecisionKey = (decisionKey) => {
  const hash = crypto.createHash('sha256').update(String(decisionKey)).digest('hex');
  return parseInt(hash.slice(0, 8), 16) % 10000;
};

export const hashFallbackStatus = (decisionKey, percentage) => {
  const bucket = bucketFromDecisionKey(decisionKey);
  const threshold = Math.round(Number(percentage) * 100);
  return bucket < threshold ? 'approved' : 'pending';
};

const decisionCacheKey = (entityId, decisionKey) =>
  `approval:${entityId}:decision:${decisionKey}`;

const controlKeys = (entityId, dateKey) => {
  const base = `approval:${entityId}:${dateKey}`;
  return {
    totalKey: `${base}:total`,
    approvedKey: `${base}:approved`,
    percentageKey: `${base}:percentage`,
  };
};

const ensureClient = (getClient) => {
  const client = getClient();
  if (!client) return null;
  if (
    typeof client.approvalControl !== 'function' &&
    typeof client.defineCommand === 'function'
  ) {
    client.defineCommand('approvalControl', {
      numberOfKeys: 3,
      lua: APPROVAL_CONTROL_LUA,
    });
  }
  return client;
};

const rememberDecision = async (client, cacheKey, status) => {
  if (!client || !cacheKey) return;
  if (status !== 'approved' && status !== 'pending') return;
  try {
    await client.set(cacheKey, status, 'EX', APPROVAL_CONTROL_TTL_SECONDS);
  } catch {
    // Decision still returned to the caller. A retry may recompute.
  }
};

export const createApprovalControl = ({
  getClient = () => redisService.getClient(),
  now = () => new Date(),
} = {}) => {
  const determineApprovalStatus = async ({
    entityId,
    decisionKey,
    approvalPercentage,
  }) => {
    const percentage = parsePayoutPercent(approvalPercentage);
    const entity = String(entityId || 'unknown');
    const key = String(decisionKey || '').trim();
    const cacheKey = key ? decisionCacheKey(entity, key) : '';

    let client = null;
    try {
      client = ensureClient(getClient);
    } catch {
      client = null;
    }

    if (client && cacheKey) {
      try {
        const cached = await client.get(cacheKey);
        if (cached === 'approved' || cached === 'pending') return cached;
      } catch {
        client = null;
      }
    }

    if (percentage >= 100) {
      await rememberDecision(client, cacheKey, 'approved');
      return 'approved';
    }
    if (percentage <= 0) {
      await rememberDecision(client, cacheKey, 'pending');
      return 'pending';
    }

    const seed = key || entity;
    if (!client || typeof client.approvalControl !== 'function') {
      return hashFallbackStatus(seed, percentage);
    }

    try {
      const dateKey = istDateKey(now());
      const keys = controlKeys(entity, dateKey);
      const bucket = bucketFromDecisionKey(seed);
      const tolerance = Number.isFinite(APPROVAL_TOLERANCE_PERCENT)
        ? APPROVAL_TOLERANCE_PERCENT
        : 2;
      const result = await client.approvalControl(
        keys.totalKey,
        keys.approvedKey,
        keys.percentageKey,
        String(percentage),
        String(tolerance),
        String(bucket),
        String(APPROVAL_CONTROL_TTL_SECONDS),
      );
      const status =
        Array.isArray(result) && (result[0] === 'approved' || result[0] === 'pending')
          ? result[0]
          : hashFallbackStatus(seed, percentage);
      await rememberDecision(client, cacheKey, status);
      return status;
    } catch {
      return hashFallbackStatus(seed, percentage);
    }
  };

  const resolveApprovalHold = async ({
    campaignId,
    vendorId,
    payoutPercent,
    decisionKey,
  }) => {
    const percent = parsePayoutPercent(payoutPercent);
    const approvalStatus = await determineApprovalStatus({
      entityId: approvalEntityId(campaignId, vendorId),
      decisionKey,
      approvalPercentage: percent,
    });
    return {
      held: approvalStatus !== 'approved',
      payoutPercent: percent,
      approvalStatus,
      seq: null,
    };
  };

  return { determineApprovalStatus, resolveApprovalHold };
};

const defaultControl = createApprovalControl();

export const determineApprovalStatus = (input) =>
  defaultControl.determineApprovalStatus(input);

export const resolveApprovalHold = (input) =>
  defaultControl.resolveApprovalHold(input);
