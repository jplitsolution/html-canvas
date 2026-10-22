/**
 * campaigns capping columns:
 * - capping_enabled: boolean
 * - capping_limit: int
 * - capping_action: 'stop' | 'fallback'
 * - fallback_campaign_id: int
 * - capping_interval: 'daily' | 'total'
 */
export class AddCampaignCapping1980000000000 {
  name = 'AddCampaignCapping1980000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('campaigns', 'capping_enabled'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "capping_enabled" boolean NOT NULL DEFAULT false`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'capping_limit'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "capping_limit" int NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'capping_action'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "capping_action" varchar(16) NOT NULL DEFAULT 'stop'`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'fallback_campaign_id'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "fallback_campaign_id" int NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'capping_interval'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "capping_interval" varchar(16) NOT NULL DEFAULT 'daily'`,
        );
      }
    } else {
      if (!(await queryRunner.hasColumn('campaigns', 'capping_enabled'))) {
        await queryRunner.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`capping_enabled\` tinyint(1) NOT NULL DEFAULT 0`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'capping_limit'))) {
        await queryRunner.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`capping_limit\` int NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'capping_action'))) {
        await queryRunner.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`capping_action\` varchar(16) NOT NULL DEFAULT 'stop'`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'fallback_campaign_id'))) {
        await queryRunner.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`fallback_campaign_id\` int NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'capping_interval'))) {
        await queryRunner.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`capping_interval\` varchar(16) NOT NULL DEFAULT 'daily'`,
        );
      }
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const cols = [
      'capping_enabled',
      'capping_limit',
      'capping_action',
      'fallback_campaign_id',
      'capping_interval',
    ];
    for (const col of cols) {
      if (isPostgres) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "${col}"`,
        );
      } else {
        await queryRunner.query(
          `ALTER TABLE \`campaigns\` DROP COLUMN \`${col}\``,
        );
      }
    }
  }
}
