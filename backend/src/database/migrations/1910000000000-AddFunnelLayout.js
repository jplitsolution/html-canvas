/**
 * campaigns.funnel_layout — classic vs packs_on_home identity-before-HOME.
 */
export class AddFunnelLayout1910000000000 {
  name = 'AddFunnelLayout1910000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('campaigns', 'funnel_layout'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "funnel_layout" varchar(32) NOT NULL DEFAULT 'classic'`,
        );
      }
    } else if (!(await queryRunner.hasColumn('campaigns', 'funnel_layout'))) {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` ADD COLUMN \`funnel_layout\` varchar(32) NOT NULL DEFAULT 'classic'`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "funnel_layout"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` DROP COLUMN \`funnel_layout\``,
      );
    }
  }
}
