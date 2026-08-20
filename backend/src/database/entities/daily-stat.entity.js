import { EntitySchema } from 'typeorm';

export class DailyStat {}

export const DailyStatSchema = new EntitySchema({
  name: 'DailyStat',
  target: DailyStat,
  tableName: 'daily_stats',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** Calendar day YYYY-MM-DD in `timezone` (varchar avoids TZ Date shifts). */
    statDate: {
      name: 'stat_date',
      type: 'varchar',
      length: 10,
    },
    timezone: {
      type: 'varchar',
      length: 64,
      default: 'Asia/Kolkata',
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      default: 0,
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int',
      default: 0,
    },
    visits: { type: 'int', default: 0 },
    msisdnResolved: { name: 'msisdn_resolved', type: 'int', default: 0 },
    heFailCg: { name: 'he_fail_cg', type: 'int', default: 0 },
    otpSend: { name: 'otp_send', type: 'int', default: 0 },
    otpVerify: { name: 'otp_verify', type: 'int', default: 0 },
    subscribeSuccess: { name: 'subscribe_success', type: 'int', default: 0 },
    subscribeFailed: { name: 'subscribe_failed', type: 'int', default: 0 },
    postbacksQueued: { name: 'postbacks_queued', type: 'int', default: 0 },
    pending: { type: 'int', default: 0 },
    billingReceived: { name: 'billing_received', type: 'int', default: 0 },
    vendorSent: { name: 'vendor_sent', type: 'int', default: 0 },
    vendorFailed: { name: 'vendor_failed', type: 'int', default: 0 },
    skipped: { type: 'int', default: 0 },
    unmatchedCallbacks: { name: 'unmatched_callbacks', type: 'int', default: 0 },
    rolledAt: {
      name: 'rolled_at',
      type: 'timestamp',
    },
  },
  indices: [
    {
      name: 'UQ_daily_stats_grain',
      columns: ['statDate', 'timezone', 'campaignId', 'vendorId'],
      unique: true,
    },
    { name: 'IDX_daily_stats_date', columns: ['statDate'] },
    { name: 'IDX_daily_stats_campaign', columns: ['campaignId', 'statDate'] },
    { name: 'IDX_daily_stats_vendor', columns: ['vendorId', 'statDate'] },
  ],
});
