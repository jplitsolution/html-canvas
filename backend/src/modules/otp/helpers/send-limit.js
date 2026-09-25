// One shared number budget across providers, campaigns, visits and publishers.
// Reserve before sending: even a timeout may have queued an SMS at the operator.
const RESERVE_SEND = `
local nowParts = redis.call('TIME')
local now = tonumber(nowParts[1]) * 1000 + math.floor(tonumber(nowParts[2]) / 1000)
local count = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
if count >= 2 then
  return {0, math.max(1, redis.call('PTTL', KEYS[1])), 'blocked'}
end
if count == 1 then
  local remaining = 60000 - (now - tonumber(redis.call('HGET', KEYS[1], 'lastSend')))
  if remaining > 0 then return {0, remaining, 'cooldown'} end
end
redis.call('HSET', KEYS[1], 'count', count + 1, 'lastSend', now)
redis.call('PEXPIRE', KEYS[1], 86400000)
return {1, 0}
`;

const configuredMessage = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

export const reserveOtpSend = async (client, phone, config = {}) => {
  const msisdn = String(phone || '').replace(/\D/g, '');
  if (!msisdn) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  let result;
  try {
    // Do not use the cache helpers: their fail-open fallback bypasses the limit.
    if (!client) throw new Error('Redis unavailable');
    result = await client.eval(RESERVE_SEND, 1, `otp:send-limit:${msisdn}`);
  } catch {
    const err = new Error(configuredMessage(
      config.otpUnavailableMessage,
      'OTP sending is temporarily unavailable. Please try again later.',
    ));
    err.statusCode = 503;
    throw err;
  }

  if (Number(result[0]) !== 1) {
    const seconds = Math.ceil(Number(result[1]) / 1000);
    const message = configuredMessage(
      result[2] === 'blocked' ? config.otpBlockedMessage : config.otpCooldownMessage,
      result[2] === 'blocked'
        ? 'OTP send limit reached. Please try again in {{seconds}} seconds.'
        : 'Please wait {{seconds}} seconds before requesting another OTP.',
    ).replaceAll('{{seconds}}', String(seconds));
    const err = new Error(message);
    err.statusCode = 429;
    throw err;
  }
};
