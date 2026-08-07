import { EntitySchema } from 'typeorm';

export class Campaign {}

export const CampaignSchema = new EntitySchema({
  name: 'Campaign',
  target: Campaign,
  tableName: 'campaigns',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar',
    },
    country: {
      type: 'varchar',
    },
    operator: {
      type: 'varchar',
    },
    operatorId: {
      name: 'operator_id',
      type: 'int',
      nullable: true,
    },
    serviceId: {
      name: 'service_id',
      type: 'varchar',
      nullable: true,
    },
    active: {
      type: 'boolean',
      default: false,
    },
    userId: {
      name: 'user_id',
      type: 'int',
    },
    verificationMode: {
      name: 'verification_mode',
      type: 'varchar',
      length: 16,
      nullable: true,
    },
    flowConfig: {
      name: 'flow_config',
      type: 'text',
      nullable: true,
    },
    cgRedirectUrl: {
      name: 'cg_redirect_url',
      type: 'varchar',
      length: 1024,
      nullable: true,
    },
    successRedirectUrl: {
      name: 'success_redirect_url',
      type: 'varchar',
      length: 1024,
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
    marketOperator: {
      type: 'many-to-one',
      target: 'Operator',
      inverseSide: 'campaigns',
      joinColumn: { name: 'operator_id' },
      onDelete: 'SET NULL',
      nullable: true,
    },
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE',
    },
    trackings: {
      type: 'one-to-many',
      target: 'CampaignTracking',
      inverseSide: 'campaign',
      cascade: true,
      orphanedRowAction: 'delete',
    },
    pages: {
      type: 'one-to-many',
      target: 'CampaignPage',
      inverseSide: 'campaign',
    },
  },
  indices: [
    {
      name: 'IDX_CAMPAIGN_OPERATOR_NAME',
      unique: true,
      columns: ['operatorId', 'name'],
    },
  ],
});
