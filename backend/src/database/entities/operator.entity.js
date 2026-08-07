import { EntitySchema } from 'typeorm';

export class Operator {}

export const OperatorSchema = new EntitySchema({
  name: 'Operator',
  target: Operator,
  tableName: 'operators',
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
      length: 64,
    },
    countryId: {
      name: 'country_id',
      type: 'int',
    },
    userId: {
      name: 'user_id',
      type: 'int',
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
    country: {
      type: 'many-to-one',
      target: 'Country',
      inverseSide: 'operators',
      joinColumn: { name: 'country_id' },
      onDelete: 'CASCADE',
    },
    campaigns: {
      type: 'one-to-many',
      target: 'Campaign',
      inverseSide: 'marketOperator',
    },
  },
  indices: [
    {
      name: 'IDX_OPERATOR_COUNTRY_CODE',
      unique: true,
      columns: ['countryId', 'code'],
    },
  ],
});
