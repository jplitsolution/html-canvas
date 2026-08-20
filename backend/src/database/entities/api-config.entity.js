import { EntitySchema } from 'typeorm';

export class ApiConfig {}

export const ApiConfigSchema = new EntitySchema({
  name: 'ApiConfig',
  target: ApiConfig,
  tableName: 'api_configs',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int',
    },
    blocklistApi: {
      name: 'blocklist_api',
      type: 'varchar',
      nullable: true,
    },
    subscriptionApi: {
      name: 'subscription_api',
      type: 'varchar',
      nullable: true,
    },
    subscribeApi: {
      name: 'subscribe_api',
      type: 'varchar',
      nullable: true,
    },
    headersJson: {
      name: 'headers_json',
      type: 'text',
      nullable: true,
    },
    otpConfigJson: {
      name: 'otp_config_json',
      type: 'text',
      nullable: true,
    },
    resolveMsisdnUrl: {
      name: 'resolve_msisdn_url',
      type: 'varchar',
      length: 1024,
      nullable: true,
    },
    heProvider: {
      name: 'he_provider',
      type: 'varchar',
      length: 32,
      nullable: true,
      default: 'header',
    },
    heConfigJson: {
      name: 'he_config_json',
      type: 'text',
      nullable: true,
    },
    /** Checksub status mapping: { statusField, rules[], missGo, missPage, missUrl } */
    checksubConfigJson: {
      name: 'checksub_config_json',
      type: 'text',
      nullable: true,
    },
    /** Universe Telecom DCB provider, endpoint and response-normalizer config. */
    dcbConfigJson: {
      name: 'dcb_config_json',
      type: 'text',
      nullable: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
  },
  indices: [
    {
      name: 'IDX_API_CONFIG_CAMPAIGN_ID',
      unique: true,
      columns: ['campaignId'],
    },
  ],
});
