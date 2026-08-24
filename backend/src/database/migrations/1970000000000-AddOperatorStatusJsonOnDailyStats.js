/**
 * Operator callback mix JSON on daily_stats (active / grace / parking / …).
 */
export class AddOperatorStatusJsonOnDailyStats1970000000000 {
  name = 'AddOperatorStatusJsonOnDailyStats1970000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasTable('daily_stats'))) return;
    if (await queryRunner.hasColumn('daily_stats', 'operator_status_json')) return;

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE "daily_stats"
        ADD COLUMN "operator_status_json" jsonb
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE \`daily_stats\`
        ADD COLUMN \`operator_status_json\` json NULL
      `);
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!(await queryRunner.hasTable('daily_stats'))) return;
    if (!(await queryRunner.hasColumn('daily_stats', 'operator_status_json'))) return;

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" DROP COLUMN "operator_status_json"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`daily_stats\` DROP COLUMN \`operator_status_json\``,
      );
    }
  }
}
