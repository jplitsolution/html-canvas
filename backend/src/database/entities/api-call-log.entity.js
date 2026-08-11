import { EntitySchema } from 'typeorm';

export class ApiCallLog {}

export const ApiCallType = {
  CHECKSUB: 'checksub',
  SUBSCRIBE: 'subscribe',
  BLOCKLIST: 'blocklist',
  RESOLVE_MSISDN: 'resolve_msisdn',
  PRIORITY: 'priority',
  OTP_SEND: 'otp_send',
  OTP_VERIFY: 'otp_verify',
  OTP_EXPOSE_SEND_IN: 'otp_expose_send_in',
  OTP_EXPOSE_VERIFY_IN: 'otp_expose_verify_in',
  HE_TOKEN: 'he_token',
  HE_MSISDN: 'he_msisdn',
  HE_RESOLVE: 'he_resolve',
  HE_REDIRECT: 'he_redirect',
  BILLING_CALLBACK: 'billing_callback',
  VENDOR_POSTBACK: 'vendor_postback',
};

export const ApiCallLogSchema = new EntitySchema({
  name: 'ApiCallLog',
  target: ApiCallLog,
  tableName: 'api_call_logs',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    visitId: {
      name: 'visit_id',
      type: 'int',
      nullable: true,
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      nullable: true,
    },
    msisdn: {
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    rcid: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    clickId: {
      name: 'click_id',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    callType: {
      name: 'call_type',
      type: 'varchar',
      length: 32,
    },
    requestUrl: {
      name: 'request_url',
      type: 'text',
      nullable: true,
    },
    requestBody: {
      name: 'request_body',
      type: 'text',
      nullable: true,
    },
    responseStatus: {
      name: 'response_status',
      type: 'int',
      nullable: true,
    },
    responseBody: {
      name: 'response_body',
      type: 'text',
      nullable: true,
    },
    success: {
      type: 'boolean',
      nullable: true,
    },
    errorMessage: {
      name: 'error_message',
      type: 'text',
      nullable: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  indices: [
    { name: 'IDX_api_call_logs_msisdn', columns: ['msisdn'] },
    { name: 'IDX_api_call_logs_rcid', columns: ['rcid'] },
    { name: 'IDX_api_call_logs_click_id', columns: ['clickId'] },
    { name: 'IDX_api_call_logs_visit_id', columns: ['visitId'] },
  ],
});
