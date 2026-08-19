import { EntitySchema } from 'typeorm';

export class ConversionPostback {}

export const ConversionPostbackStatus = {
  PENDING: 'pending',
  RECEIVED: 'received',
  SENT: 'sent',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

export const ConversionPostbackSchema = new EntitySchema({
  name: 'ConversionPostback',
  target: ConversionPostback,
  tableName: 'conversion_postbacks',
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
    msisdn: {
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    /**
     * Vendor / network campid from tracking URL (?campid=).
     * Fills postback {campid} / {camp}.
     */
    campid: {
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    /** Our tracking id (BF-OBF-11) from ?tracking_campid=. */
    trackingCampid: {
      name: 'tracking_campid',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    clickId: {
      name: 'click_id',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    /** Affiliate original click — used in postback {rcid} placeholder. */
    rcid: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    offerCode: {
      name: 'offer_code',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    postbackUrl: {
      name: 'postback_url',
      type: 'text',
      nullable: true,
    },
    status: {
      type: 'varchar',
      length: 32,
      default: ConversionPostbackStatus.PENDING,
    },
    httpStatus: {
      name: 'http_status',
      type: 'int',
      nullable: true,
    },
    responseBody: {
      name: 'response_body',
      type: 'text',
      nullable: true,
    },
    errorMessage: {
      name: 'error_message',
      type: 'text',
      nullable: true,
    },
    sentAt: {
      name: 'sent_at',
      type: 'timestamp',
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
      name: 'UQ_conversion_postbacks_msisdn',
      columns: ['msisdn'],
      unique: true,
    },
    { name: 'IDX_postbacks_visit', columns: ['visitId'] },
    { name: 'IDX_postbacks_campid', columns: ['campid'] },
    { name: 'IDX_postbacks_click_id', columns: ['clickId'] },
  ],
});
