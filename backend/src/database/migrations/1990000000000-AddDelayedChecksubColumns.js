/**
 * conversion_postbacks delayed checksub columns:
 * - delayed_checksub_status: varchar(32), nullable - 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
 * - delayed_checksub_scheduled_at: timestamp, nullable - when checksub should run (created_at + delay_minutes)
 * - delayed_checksub_executed_at: timestamp, nullable - when checksub actually ran
 * - delayed_checksub_outcome: varchar(64), nullable - raw partner status value (e.g. 'ACTIVE', 'INACTIVE', 'GRACE')
 * - delayed_checksub_response: text, nullable - raw JSON response from partner
 *
 * Also adds index IDX_postbacks_delayed_checksub_status_scheduled on
 * (delayed_checksub_status, delayed_checksub_scheduled_at) for cron worker query performance.
 */
export class AddDelayedChecksubColumns1990000000000 {
  name = 'AddDelayedChecksubColumns1990000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_status'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "delayed_checksub_status" varchar(32) NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_scheduled_at'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "delayed_checksub_scheduled_at" timestamp NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_executed_at'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "delayed_checksub_executed_at" timestamp NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_outcome'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "delayed_checksub_outcome" varchar(64) NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_response'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "delayed_checksub_response" text NULL`,
        );
      }
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_delayed_checksub_status_scheduled"
         ON "conversion_postbacks" ("delayed_checksub_status", "delayed_checksub_scheduled_at")`,
      );
    } else {
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_status'))) {
        await queryRunner.query(
          `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`delayed_checksub_status\` varchar(32) NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_scheduled_at'))) {
        await queryRunner.query(
          `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`delayed_checksub_scheduled_at\` timestamp NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_executed_at'))) {
        await queryRunner.query(
          `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`delayed_checksub_executed_at\` timestamp NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_outcome'))) {
        await queryRunner.query(
          `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`delayed_checksub_outcome\` varchar(64) NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('conversion_postbacks', 'delayed_checksub_response'))) {
        await queryRunner.query(
          `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`delayed_checksub_response\` text NULL`,
        );
      }
      await queryRunner.query(
        `CREATE INDEX \`IDX_postbacks_delayed_checksub_status_scheduled\`
         ON \`conversion_postbacks\` (\`delayed_checksub_status\`, \`delayed_checksub_scheduled_at\`)`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const cols = [
      'delayed_checksub_status',
      'delayed_checksub_scheduled_at',
      'delayed_checksub_executed_at',
      'delayed_checksub_outcome',
      'delayed_checksub_response',
    ];

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_postbacks_delayed_checksub_status_scheduled"`,
      );
      for (const col of cols) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" DROP COLUMN IF EXISTS "${col}"`,
        );
      }
    } else {
      await queryRunner.query(
        `DROP INDEX \`IDX_postbacks_delayed_checksub_status_scheduled\` ON \`conversion_postbacks\``,
      );
      for (const col of cols) {
        await queryRunner.query(
          `ALTER TABLE \`conversion_postbacks\` DROP COLUMN \`${col}\``,
        );
      }
    }
  }
}
