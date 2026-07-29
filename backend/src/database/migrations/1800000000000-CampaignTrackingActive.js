export class CampaignTrackingActive1800000000000 {
  name = 'CampaignTrackingActive1800000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (!(await queryRunner.hasTable('campaign_trackings'))) return;

    const hasActive = await queryRunner.hasColumn('campaign_trackings', 'active');
    if (hasActive) return;

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE "campaign_trackings"
        ADD COLUMN "active" boolean NOT NULL DEFAULT true
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE \`campaign_trackings\`
        ADD COLUMN \`active\` tinyint NOT NULL DEFAULT 1
      `);
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasTable('campaign_trackings'))) return;
    if (!(await queryRunner.hasColumn('campaign_trackings', 'active'))) return;

    if (isPostgres) {
      await queryRunner.query(`ALTER TABLE "campaign_trackings" DROP COLUMN "active"`);
    } else {
      await queryRunner.query(`ALTER TABLE \`campaign_trackings\` DROP COLUMN \`active\``);
    }
  }
}
