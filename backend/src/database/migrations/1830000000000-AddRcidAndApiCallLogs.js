/**
 * visits.rcid (affiliate click) + conversion_postbacks.rcid
 * + api_call_logs (partner checksub/subscribe/blocklist audit — DB source of truth)
 */
export class AddRcidAndApiCallLogs1830000000000 {
  name = 'AddRcidAndApiCallLogs1830000000000';

  async safeQuery(queryRunner, sql) {
    try {
      await queryRunner.query(sql);
    } catch (err) {
      if (!/already exists|duplicate|does not exist/i.test(err.message)) throw err;
    }
  }

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('visits', 'rcid'))) {
        await queryRunner.query(
          `ALTER TABLE "visits" ADD COLUMN "rcid" varchar`,
        );
      }
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_VISIT_RCID" ON "visits" ("rcid")`,
      );

      if (!(await queryRunner.hasColumn('conversion_postbacks', 'rcid'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "rcid" varchar(255)`,
        );
      }
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_rcid" ON "conversion_postbacks" ("rcid")`,
      );

      await this.safeQuery(
        queryRunner,
        `
        CREATE TABLE IF NOT EXISTS "api_call_logs" (
          "id" SERIAL PRIMARY KEY,
          "visit_id" int,
          "campaign_id" int,
          "msisdn" varchar(64),
          "rcid" varchar(255),
          "click_id" varchar(255),
          "call_type" varchar(32) NOT NULL,
          "request_url" text,
          "request_body" text,
          "response_status" int,
          "response_body" text,
          "success" boolean,
          "error_message" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_msisdn" ON "api_call_logs" ("msisdn")`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_rcid" ON "api_call_logs" ("rcid")`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_click_id" ON "api_call_logs" ("click_id")`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_visit_id" ON "api_call_logs" ("visit_id")`,
      );
    } else {
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`visits\` ADD COLUMN \`rcid\` varchar(255) NULL`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`rcid\` varchar(255) NULL`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS "api_call_logs"`);
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "conversion_postbacks" DROP COLUMN IF EXISTS "rcid"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "visits" DROP COLUMN IF EXISTS "rcid"`,
      );
    }
  }
}
