import { EntitySchema } from 'typeorm';

export class CampaignTracking {}

export const CampaignTrackingSchema = new EntitySchema({
  name: 'CampaignTracking',
  target: CampaignTracking,
  tableName: 'campaign_trackings',
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
    vendorId: {
      name: 'vendor_id',
      type: 'int',
    },
    affiliateId: {
      name: 'affiliate_id',
      type: 'int',
      nullable: true,
    },
    active: {
      type: 'boolean',
      default: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    campaign: {
      type: 'many-to-one',
      target: 'Campaign',
      inverseSide: 'trackings',
      joinColumn: { name: 'campaign_id' },
      onDelete: 'CASCADE',
    },
    vendor: {
      type: 'many-to-one',
      target: 'Vendor',
      joinColumn: { name: 'vendor_id' },
      onDelete: 'CASCADE',
    },
    affiliate: {
      type: 'many-to-one',
      target: 'Affiliate',
      joinColumn: { name: 'affiliate_id' },
      onDelete: 'CASCADE',
      nullable: true,
    },
  },
});
