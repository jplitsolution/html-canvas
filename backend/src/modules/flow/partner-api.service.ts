import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ApiConfig } from '../api-config/entities/api-config.entity';

interface PartnerInput {
  phone?: string;
  serviceId?: string;
  country?: string;
  operator?: string;
  planId?: string;
  visitId?: number;
  subscriptionUrl?: string;
}

@Injectable()
export class PartnerApiService {
  private readonly logger = new Logger(PartnerApiService.name);

  private parseHeaders(headersJson?: string): Record<string, string> {
    if (!headersJson) return {};
    try {
      return JSON.parse(headersJson) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private resolveTemplate(
    template: string,
    vars: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      result = result.split(`{{${key}}}`).join(val ?? '');
    }
    return result;
  }

  /** Maps funnel pack (daily|weekly|monthly) to operator subServiceId (H-prefix). */
  private mapSubServiceId(pack?: string): string {
    const p = (pack || 'daily').toLowerCase();
    if (p === 'weekly') return 'HWeekly';
    if (p === 'monthly') return 'HMonthly';
    return 'HDaily';
  }

  private buildVars(input: PartnerInput): Record<string, string> {
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

  /**
   * Resolves `{{placeholder}}` tokens in the URL and dispatches the request.
   * If the resolved URL contains a query string (`?`) we send a GET (matches
   * query-param partner APIs like SubOTP); otherwise a JSON-body POST for
   * legacy partners. Returns the raw axios response.
   */
  private async sendRequest(
    rawUrl: string,
    input: PartnerInput,
    headers: Record<string, string>,
    label: string,
  ) {
    const url = this.resolveTemplate(rawUrl, this.buildVars(input));
    const useGet = url.includes('?');
    this.logger.log(`${label} → ${useGet ? 'GET' : 'POST'} ${url}`);
    return useGet
      ? axios.get(url, { headers, timeout: 5000 })
      : axios.post(url, input, { headers, timeout: 5000 });
  }

  /**
   * Resolve an MSISDN via the configured ISP/partner API (resolveMsisdnUrl).
   * Used by MSISDN_ONLY / BOTH verification modes. Returns the normalized
   * phone string or null when it cannot be resolved. Never throws.
   */
  async resolveMsisdn(
    config: ApiConfig | null,
    input: { country?: string; operator?: string; hint?: string },
  ): Promise<string | null> {
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
      const data = (response.data ?? {}) as Record<string, unknown>;
      const nested = (data.data ?? data) as Record<string, unknown>;
      const candidate =
        (nested.msisdn as string) ??
        (nested.phone as string) ??
        (data.msisdn as string) ??
        (data.phone as string) ??
        '';
      const resolved = String(candidate || '').trim();
      this.logger.log(`resolveMsisdn ← ${resolved ? 'resolved' : 'empty'}`);
      return resolved || null;
    } catch (err) {
      this.logger.warn(`resolveMsisdn failed: ${(err as Error).message}`);
      return null;
    }
  }

  async checkSubscription(
    config: ApiConfig | null,
    input: {
      phone: string;
      serviceId: string;
      country: string;
      operator: string;
    },
  ): Promise<boolean> {
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
      const data = (response.data ?? {}) as Record<string, unknown>;
      // SubOTP-style: { responseCode:"0", data:{ subscriptionStatus:"active" } }
      const nested = (data.data ?? data) as Record<string, unknown>;
      const status = nested.subscriptionStatus;
      let subscribed: boolean;
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
      this.logger.warn(`checkSubscription failed: ${(err as Error).message}`);
      return false;
    }
  }

  async checkBlocked(
    config: ApiConfig | null,
    input: { phone: string; country: string; operator: string },
  ): Promise<{ blocked: boolean; reason?: string }> {
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
      const data = (response.data ?? {}) as Record<string, unknown>;
      const nested = (data.data ?? data) as Record<string, unknown>;
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
      this.logger.warn(`checkBlocked failed: ${(err as Error).message}`);
      return { blocked: false };
    }
  }

  async subscribe(
    config: ApiConfig | null,
    input: {
      phone: string;
      serviceId: string;
      country: string;
      operator: string;
      visitId: number;
      planId?: string;
      subscriptionUrl?: string;
    },
  ): Promise<boolean> {
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
      const data = (response.data ?? {}) as Record<string, unknown>;
      // responseCode is authoritative when present ("0" = success).
      const code = data.responseCode ?? data.response_code;
      let success: boolean;
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
      this.logger.warn(`subscribe failed: ${(err as Error).message}`);
      return false;
    }
  }
}
