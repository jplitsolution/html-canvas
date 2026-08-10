/**
 * api_configs.checksub_config_json — campaign-level checksub status → destination rules
 * (body or JSON field → continue / page / external). Priority Chain is separate.
 */
export class AddChecksubConfigJson1900000000000 {
  name = 'AddChecksubConfigJson1900000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('api_configs', 'checksub_config_json'))) {
        await queryRunner.query(
          `ALTER TABLE "api_configs" ADD COLUMN "checksub_config_json" text`,
        );
      }
    } else if (!(await queryRunner.hasColumn('api_configs', 'checksub_config_json'))) {
      await queryRunner.query(
        `ALTER TABLE \`api_configs\` ADD COLUMN \`checksub_config_json\` text NULL`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "api_configs" DROP COLUMN IF EXISTS "checksub_config_json"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`api_configs\` DROP COLUMN \`checksub_config_json\``,
      );
    }
  }
}
