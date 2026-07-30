import { EntitySchema } from 'typeorm';

export class Country {}

export const CountrySchema = new EntitySchema({
  name: 'Country',
  target: Country,
  tableName: 'countries',
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
      length: 16,
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
    operators: {
      type: 'one-to-many',
      target: 'Operator',
      inverseSide: 'country',
    },
  },
  indices: [
    {
      name: 'IDX_COUNTRY_USER_CODE',
      unique: true,
      columns: ['userId', 'code'],
    },
  ],
});
