/**
 * api_configs.dcb_config_json — Universe Telecom DCB endpoints, credentials and
 * deterministic response-normalizer configuration.
 */
export class AddDcbConfigJson1940000000000 {
  name = 'AddDcbConfigJson1940000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasColumn('api_configs', 'dcb_config_json'))) {
      await queryRunner.query(
        isPostgres
          ? `ALTER TABLE "api_configs" ADD COLUMN "dcb_config_json" text`
          : `ALTER TABLE \`api_configs\` ADD COLUMN \`dcb_config_json\` text NULL`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasColumn('api_configs', 'dcb_config_json')))
      return;
    await queryRunner.query(
      isPostgres
        ? `ALTER TABLE "api_configs" DROP COLUMN IF EXISTS "dcb_config_json"`
        : `ALTER TABLE \`api_configs\` DROP COLUMN \`dcb_config_json\``,
    );
  }
}
