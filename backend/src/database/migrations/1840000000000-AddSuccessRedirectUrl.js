/**
 * campaigns.success_redirect_url — content/portal URL after THANKYOU
 */
export class AddSuccessRedirectUrl1840000000000 {
  name = 'AddSuccessRedirectUrl1840000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('campaigns', 'success_redirect_url'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "success_redirect_url" varchar(1024)`,
        );
      }
    } else if (!(await queryRunner.hasColumn('campaigns', 'success_redirect_url'))) {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` ADD COLUMN \`success_redirect_url\` varchar(1024)`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "success_redirect_url"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` DROP COLUMN \`success_redirect_url\``,
      );
    }
  }
}
