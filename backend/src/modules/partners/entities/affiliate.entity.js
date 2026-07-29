import { EntitySchema } from 'typeorm';

export class Affiliate {}

export const AffiliateSchema = new EntitySchema({
  name: 'Affiliate',
  target: Affiliate,
  tableName: 'affiliates',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int',
    },
    name: {
      type: 'varchar',
    },
    code: {
      type: 'varchar',
    },
    userId: {
      name: 'user_id',
      type: 'int',
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
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
  },
  relations: {
    vendor: {
      type: 'many-to-one',
      target: 'Vendor',
      inverseSide: 'affiliates',
      joinColumn: { name: 'vendor_id' },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'IDX_AFFILIATE_USER_CODE',
      unique: true,
      columns: ['userId', 'code'],
    },
    {
      name: 'IDX_AFFILIATE_VENDOR_ID',
      columns: ['vendorId'],
    },
  ],
});
