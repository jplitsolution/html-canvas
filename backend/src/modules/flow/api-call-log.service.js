import { getRepository } from '../../database/index.js';
import { ApiCallLog } from '../../database/entities/api-call-log.entity.js';
import { searchService } from '../search/search.service.js';

const MAX_BODY = 8000;

const truncate = (value) => {
  if (value == null) return null;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > MAX_BODY ? str.slice(0, MAX_BODY) : str;
};

const maskPhone = (phone) => {
  if (!phone) return undefined;
  return String(phone).trim();
};

export const createApiCallLogService = () => {
  const getRepo = () => getRepository(ApiCallLog);

  const record = async (input) => {
    const row = getRepo().create({
      visitId: input.visitId ? parseInt(input.visitId, 10) : null,
      campaignId: input.campaignId ? parseInt(input.campaignId, 10) : null,
      msisdn: input.msisdn ? String(input.msisdn).replace(/\D/g, '') : null,
      rcid: input.rcid || null,
      clickId: input.clickId || null,
      callType: input.callType,
      requestUrl: truncate(input.requestUrl),
      requestBody: truncate(input.requestBody),
      responseStatus: input.responseStatus ?? null,
      responseBody: truncate(input.responseBody),
      success: input.success ?? null,
      errorMessage: input.errorMessage
        ? String(input.errorMessage).slice(0, 2000)
        : null,
    });
    const saved = await getRepo().save(row);

    const statusLabel =
      input.statusLabel || (saved.success ? 'SUCCESS' : 'FAILED');

    // ES is the scalable log layer; DB remains source of truth.
    void searchService.indexEvent({
      campaignId: saved.campaignId,
      visitId: saved.visitId,
      clickId: saved.clickId,
      rcid: saved.rcid,
      phoneMasked: maskPhone(saved.msisdn),
      phone: saved.msisdn || null,
      eventType: `API_${String(saved.callType || '').toUpperCase()}`,
      status: statusLabel,
      requestUrl: saved.requestUrl,
      responseStatus: saved.responseStatus,
      success: saved.success,
      timestamp: new Date().toISOString(),
    });

    return saved;
  };

  return { record };
};

export const apiCallLogService = createApiCallLogService();
