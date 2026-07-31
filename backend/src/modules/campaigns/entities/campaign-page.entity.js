import { EntitySchema } from 'typeorm';

export class CampaignPage {}

export const CampaignPageType = {
  HOME: 'HOME',
  CONFIRM: 'CONFIRM',
  OTP: 'OTP',
  THANKYOU: 'THANKYOU',
  INPROGRESS: 'INPROGRESS',
  LOW_BALANCE: 'LOW_BALANCE',
  BLOCKED: 'BLOCKED',
  ERROR: 'ERROR',
};

export const REQUIRED_CAMPAIGN_PAGE_TYPES = [
  CampaignPageType.HOME,
  CampaignPageType.CONFIRM,
  CampaignPageType.OTP,
  CampaignPageType.THANKYOU,
];

export const ALL_CAMPAIGN_PAGE_TYPES = [
  CampaignPageType.HOME,
  CampaignPageType.CONFIRM,
  CampaignPageType.OTP,
  CampaignPageType.THANKYOU,
  CampaignPageType.INPROGRESS,
  CampaignPageType.LOW_BALANCE,
  CampaignPageType.BLOCKED,
  CampaignPageType.ERROR,
];

/** Safwap checksub status → funnel page (null = continue subscribe funnel). */
export const pageTypeForSubscriptionStatus = (status, isActive = false) => {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (isActive || s === 'active') return CampaignPageType.THANKYOU;
  if (s === 'pending') return CampaignPageType.INPROGRESS;
  if (s === 'grace' || s === 'parking') return CampaignPageType.LOW_BALANCE;
  if (s && s !== 'new' && s !== 'unknown' && s !== 'failed') {
    return CampaignPageType.INPROGRESS;
  }
  return null;
};

export const CampaignPageSchema = new EntitySchema({
  name: 'CampaignPage',
  target: CampaignPage,
  tableName: 'campaign_pages',
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
    pageType: {
      name: 'page_type',
      type: 'varchar',
    },
    templateId: {
      name: 'template_id',
      type: 'int',
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
  relations: {
    campaign: {
      type: 'many-to-one',
      target: 'Campaign',
      inverseSide: 'pages',
      joinColumn: { name: 'campaign_id' },
      onDelete: 'CASCADE',
    },
    template: {
      type: 'many-to-one',
      target: 'Template',
      joinColumn: { name: 'template_id' },
      onDelete: 'SET NULL',
      nullable: true,
    },
  },
  indices: [
    {
      name: 'IDX_CAMPAIGN_PAGE_TYPE',
      unique: true,
      columns: ['campaignId', 'pageType'],
    },
  ],
});
