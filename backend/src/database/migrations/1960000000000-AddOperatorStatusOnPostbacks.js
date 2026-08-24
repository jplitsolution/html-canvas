/**
 * Latest operator billing callback status on conversion_postbacks.
 */
export class AddOperatorStatusOnPostbacks1960000000000 {
  name = 'AddOperatorStatusOnPostbacks1960000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasTable('conversion_postbacks'))) return;
    if (await queryRunner.hasColumn('conversion_postbacks', 'operator_status')) {
      return;
    }

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE "conversion_postbacks"
        ADD COLUMN "operator_status" varchar(64)
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_postbacks_operator_status"
        ON "conversion_postbacks" ("operator_status")
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE \`conversion_postbacks\`
        ADD COLUMN \`operator_status\` varchar(64) NULL
      `);
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasTable('conversion_postbacks'))) return;
    if (!(await queryRunner.hasColumn('conversion_postbacks', 'operator_status'))) {
      return;
    }

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_postbacks_operator_status"`,
      );
      await queryRunner.query(
        `ALTER TABLE "conversion_postbacks" DROP COLUMN "operator_status"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`conversion_postbacks\` DROP COLUMN \`operator_status\``,
      );
    }
  }
}
