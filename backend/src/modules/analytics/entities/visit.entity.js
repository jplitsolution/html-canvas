import { EntitySchema } from 'typeorm';

export class Visit {}

export const VisitStatus = {
  VISIT: 'VISIT',
  BLOCKED: 'BLOCKED',
  SUBSCRIBED: 'SUBSCRIBED',
  PLAN_SHOWN: 'PLAN_SHOWN',
  HOME_SHOWN: 'HOME_SHOWN',
  OTP_SHOWN: 'OTP_SHOWN',
  CONFIRM_SHOWN: 'CONFIRM_SHOWN',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

export const VisitSchema = new EntitySchema({
  name: 'Visit',
  target: Visit,
  tableName: 'visits',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      nullable: true,
    },
    phone: {
      type: 'varchar',
      nullable: true,
    },
    country: {
      type: 'varchar',
      nullable: true,
    },
    operator: {
      type: 'varchar',
      nullable: true,
    },
    ipAddress: {
      name: 'ip_address',
      type: 'varchar',
      nullable: true,
    },
    userAgent: {
      name: 'user_agent',
      type: 'varchar',
      nullable: true,
    },
    landingUrl: {
      name: 'landing_url',
      type: 'text',
      nullable: true,
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int',
      nullable: true,
    },
    affiliateId: {
      name: 'affiliate_id',
      type: 'int',
      nullable: true,
    },
    clickId: {
      name: 'click_id',
      type: 'varchar',
      nullable: true,
    },
    vidRaw: {
      name: 'vid_raw',
      type: 'varchar',
      nullable: true,
    },
    affRaw: {
      name: 'aff_raw',
      type: 'varchar',
      nullable: true,
    },
    visitStatus: {
      name: 'visit_status',
      type: 'varchar',
      default: VisitStatus.VISIT,
    },
    pageType: {
      name: 'page_type',
      type: 'varchar',
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
    events: {
      type: 'one-to-many',
      target: 'VisitEvent',
      inverseSide: 'visit',
    },
  },
  indices: [
    { name: 'IDX_VISIT_CAMPAIGN_ID', columns: ['campaignId'] },
    { name: 'IDX_VISIT_VENDOR_ID', columns: ['vendorId'] },
    { name: 'IDX_VISIT_AFFILIATE_ID', columns: ['affiliateId'] },
    { name: 'IDX_VISIT_CLICK_ID', columns: ['clickId'] },
  ],
});
