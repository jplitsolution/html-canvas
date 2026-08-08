/**
 * campaigns.postback_register_at — when to queue vendor CPA pending row
 *   confirm = CONFIRM click only (classic)
 *   otp     = OTP verify/continue only (pin=subscribe / skip confirm)
 *   both    = OTP continue and CONFIRM click
 */
export class AddPostbackRegisterAt1890000000000 {
  name = 'AddPostbackRegisterAt1890000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('campaigns', 'postback_register_at'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "postback_register_at" varchar(16) NOT NULL DEFAULT 'confirm'`,
        );
      }
    } else if (!(await queryRunner.hasColumn('campaigns', 'postback_register_at'))) {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` ADD COLUMN \`postback_register_at\` varchar(16) NOT NULL DEFAULT 'confirm'`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "postback_register_at"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`campaigns\` DROP COLUMN \`postback_register_at\``,
      );
    }
  }
}
