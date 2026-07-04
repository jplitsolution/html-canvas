import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ApiConfig } from '../api-config/entities/api-config.entity';

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
      this.logger.log(`checkSubscription → POST ${config.subscriptionApi}`);
      const response = await axios.post(config.subscriptionApi, input, {
        headers,
        timeout: 5000,
      });
      const data = response.data as Record<string, unknown>;
      const subscribed = Boolean(
        data?.subscribed ?? data?.isSubscribed ?? data?.active,
      );
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
      this.logger.log(`checkBlocked → POST ${config.blocklistApi}`);
      const response = await axios.post(config.blocklistApi, input, {
        headers,
        timeout: 5000,
      });
      const data = response.data as Record<string, unknown>;
      const blocked = Boolean(data?.blocked ?? data?.isBlocked ?? data?.dnd);
      this.logger.log(`checkBlocked ← blocked=${blocked}`);
      return {
        blocked,
        reason: typeof data?.reason === 'string' ? data.reason : undefined,
      };
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
      this.logger.log(
        `subscribe → POST ${config.subscribeApi} visitId=${input.visitId} planId=${input.planId || 'n/a'}`,
      );
      const response = await axios.post(config.subscribeApi, input, {
        headers,
        timeout: 5000,
      });
      if (response.status < 200 || response.status >= 300) {
        this.logger.warn(`subscribe ← failed: HTTP ${response.status}`);
        return false;
      }
      const data = response.data as Record<string, unknown>;
      const success = typeof data?.success === 'boolean' ? data.success : true;
      this.logger.log(`subscribe ← success=${success}`);
      return success;
    } catch (err) {
      this.logger.warn(`subscribe failed: ${(err as Error).message}`);
      return false;
    }
  }
}
