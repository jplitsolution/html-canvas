/**
 * campaigns.success_redirect_mode — thankyou (show page then redirect) | immediate (skip thank-you)
 */
export class AddSuccessRedirectMode1880000000000 {
  name = 'AddSuccessRedirectMode1880000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('campaigns', 'success_redirect_mode'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "success_redirect_mode" varchar(16) NOT NULL DEFAULT 'thankyou'`,
        );
      }
    } else if (!(await queryRunner.hasColumn('campaigns', 'success_redirect_mode'))) {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` ADD COLUMN \`success_redirect_mode\` varchar(16) NOT NULL DEFAULT 'thankyou'`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "success_redirect_mode"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` DROP COLUMN \`success_redirect_mode\``,
      );
    }
  }
}
