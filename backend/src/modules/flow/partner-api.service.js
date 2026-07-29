import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PartnerApiService {
  logger = new Logger(PartnerApiService.name);

  parseHeaders(headersJson) {
    if (!headersJson) return {};
    try {
      return JSON.parse(headersJson);
    } catch {
      return {};
    }
  }

  resolveTemplate(
    template,
    vars,
  ) {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      result = result.split(`{{${key}}}`).join(val ?? '');
    }
    return result;
  }

  mapSubServiceId(pack) {
    const p = (pack || 'daily').toLowerCase();
    if (p === 'weekly') return 'HWeekly';
    if (p === 'monthly') return 'HMonthly';
    return 'HDaily';
  }

  buildVars(input) {
    const phone = input.phone ?? '';
    return {
      phone,
      msisdn: phone,
      serviceId: input.serviceId ?? '',
      country: input.country ?? '',
      operator: input.operator ?? '',
      planId: input.planId ?? '',
      pack: input.planId ?? 'daily',
      subServiceId: this.mapSubServiceId(input.planId),
    };
  }

  async sendRequest(
    rawUrl,
    input,
    headers,
    label,
  ) {
    const url = this.resolveTemplate(rawUrl, this.buildVars(input));
    const useGet = url.includes('?');
    this.logger.log(`${label} → ${useGet ? 'GET' : 'POST'} ${url}`);
    return useGet
      ? axios.get(url, { headers, timeout: 5000 })
      : axios.post(url, input, { headers, timeout: 5000 });
  }

  async resolveMsisdn(
    config,
    input,
  ) {
    if (!config?.resolveMsisdnUrl) {
      return null;
    }
    try {
      const headers = this.parseHeaders(config.headersJson);
      const response = await this.sendRequest(
        config.resolveMsisdnUrl,
        { phone: input.hint, country: input.country, operator: input.operator },
        headers,
        'resolveMsisdn',
      );
      const data = response.data ?? {};
      const nested = data.data ?? data;
      const candidate =
        nested.msisdn ??
        nested.phone ??
        data.msisdn ??
        data.phone ??
        '';
      const resolved = String(candidate || '').trim();
      this.logger.log(`resolveMsisdn ← ${resolved ? 'resolved' : 'empty'}`);
      return resolved || null;
    } catch (err) {
      this.logger.warn(`resolveMsisdn failed: ${err.message}`);
      return null;
    }
  }

  async checkSubscription(
    config,
    input,
  ) {
    if (!config?.subscriptionApi || !input.phone) {
      this.logger.debug(
        `checkSubscription skipped (api=${!!config?.subscriptionApi}, phone=${input.phone || 'empty'})`,
      );
      return false;
    }

    try {
      const headers = this.parseHeaders(config.headersJson);
      const response = await this.sendRequest(
        config.subscriptionApi,
        input,
        headers,
        'checkSubscription',
      );
      const data = response.data ?? {};
      const nested = data.data ?? data;
      const status = nested.subscriptionStatus;
      let subscribed;
      if (typeof status === 'string') {
        subscribed = status.toLowerCase() === 'active';
      } else {
        subscribed = Boolean(
          data.subscribed ?? data.isSubscribed ?? data.active,
        );
      }
      this.logger.log(`checkSubscription ← subscribed=${subscribed}`);
      return subscribed;
    } catch (err) {
      this.logger.warn(`checkSubscription failed: ${err.message}`);
      return false;
    }
  }

  async checkBlocked(
    config,
    input,
  ) {
    if (!config?.blocklistApi || !input.phone) {
      return { blocked: false };
    }

    if (input.phone.startsWith('999')) {
      this.logger.log(`checkBlocked ← blocked=true (test pattern 999*)`);
      return { blocked: true, reason: 'Test block pattern' };
    }

    try {
      const headers = this.parseHeaders(config.headersJson);
      const response = await this.sendRequest(
        config.blocklistApi,
        input,
        headers,
        'checkBlocked',
      );
      const data = response.data ?? {};
      const nested = data.data ?? data;
      const blocked = Boolean(
        data.blocked ??
        data.isBlocked ??
        data.dnd ??
        nested.blocked ??
        nested.dnd,
      );
      this.logger.log(`checkBlocked ← blocked=${blocked}`);
      const reason =
        typeof data.reason === 'string'
          ? data.reason
          : typeof nested.reason === 'string'
            ? nested.reason
            : undefined;
      return { blocked, reason };
    } catch (err) {
      this.logger.warn(`checkBlocked failed: ${err.message}`);
      return { blocked: false };
    }
  }

  async subscribe(
    config,
    input,
  ) {
    if (
      input.phone.startsWith('999') ||
      input.phone.toLowerCase().includes('fail')
    ) {
      this.logger.log(
        `subscribe ← failed (test pattern on phone=${input.phone})`,
      );
      return false;
    }

    if (!config?.subscribeApi) {
      this.logger.log(
        `subscribe ← success (no partner API configured; dev mock${input.phone ? '' : ', no phone'})`,
      );
      return true;
    }

    if (!input.phone) {
      this.logger.warn(
        'subscribe ← failed: phone/msisdn missing but subscribe API is configured',
      );
      return false;
    }

    try {
      const headers = this.parseHeaders(config.headersJson);
      const response = await this.sendRequest(
        config.subscribeApi,
        input,
        headers,
        `subscribe visitId=${input.visitId} planId=${input.planId || 'n/a'}`,
      );
      if (response.status < 200 || response.status >= 300) {
        this.logger.warn(`subscribe ← failed: HTTP ${response.status}`);
        return false;
      }
      const data = response.data ?? {};
      const code = data.responseCode ?? data.response_code;
      let success;
      if (code !== undefined && code !== null) {
        success = code === '0' || code === 0;
      } else if (typeof data.success === 'boolean') {
        success = data.success;
      } else {
        success = true;
      }
      this.logger.log(`subscribe ← success=${success}`);
      return success;
    } catch (err) {
      this.logger.warn(`subscribe failed: ${err.message}`);
      return false;
    }
  }
}
