import { EntitySchema } from 'typeorm';

export class Vendor {}

export const VendorSchema = new EntitySchema({
  name: 'Vendor',
  target: Vendor,
  tableName: 'vendors',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
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
    postbackUrl: {
      name: 'postback_url',
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
  relations: {
    affiliates: {
      type: 'one-to-many',
      target: 'Affiliate',
      inverseSide: 'vendor',
    },
  },
  indices: [
    {
      name: 'IDX_VENDOR_USER_CODE',
      unique: true,
      columns: ['userId', 'code'],
    },
  ],
});
