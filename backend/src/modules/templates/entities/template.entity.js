import { EntitySchema } from 'typeorm';

export class Template {}

export const TemplateSchema = new EntitySchema({
  name: 'Template',
  target: Template,
  tableName: 'templates',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar',
    },
    data: {
      type: 'json',
    },
    userId: {
      name: 'user_id',
      type: 'int',
      nullable: true,
    },
    isPrebuilt: {
      name: 'is_prebuilt',
      type: 'boolean',
      default: false,
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
});
