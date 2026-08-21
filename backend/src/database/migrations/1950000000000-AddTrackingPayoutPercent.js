/**
 * Per-vendor OTP expose payout % on campaign_trackings (vendor assignment).
 */
export class AddTrackingPayoutPercent1950000000000 {
  name = 'AddTrackingPayoutPercent1950000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (!(await queryRunner.hasTable('campaign_trackings'))) return;
    if (await queryRunner.hasColumn('campaign_trackings', 'payout_percent')) return;

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE "campaign_trackings"
        ADD COLUMN "payout_percent" int NOT NULL DEFAULT 100
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE \`campaign_trackings\`
        ADD COLUMN \`payout_percent\` int NOT NULL DEFAULT 100
      `);
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasTable('campaign_trackings'))) return;
    if (!(await queryRunner.hasColumn('campaign_trackings', 'payout_percent'))) return;

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "campaign_trackings" DROP COLUMN "payout_percent"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`campaign_trackings\` DROP COLUMN \`payout_percent\``,
      );
    }
  }
}
