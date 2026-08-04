/**
 * users.status — active | inactive | suspended
 */
export class AddUserStatus1850000000000 {
  name = 'AddUserStatus1850000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('users', 'status'))) {
        await queryRunner.query(
          `ALTER TABLE "users" ADD COLUMN "status" varchar(16) NOT NULL DEFAULT 'active'`,
        );
      }
    } else if (!(await queryRunner.hasColumn('users', 'status'))) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`status\` varchar(16) NOT NULL DEFAULT 'active'`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN IF EXISTS "status"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`users\` DROP COLUMN \`status\``,
      );
    }
  }
}
