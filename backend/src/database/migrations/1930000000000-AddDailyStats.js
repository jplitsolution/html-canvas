/**
 * daily_stats — rolled-up KPIs by date × campaign × vendor.
 * Source of truth for dashboards; drill-down still uses live rows.
 */
export class AddDailyStats1930000000000 {
  name = 'AddDailyStats1930000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "daily_stats" (
          "id" SERIAL PRIMARY KEY,
          "stat_date" varchar(10) NOT NULL,
          "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
          "campaign_id" int NOT NULL DEFAULT 0,
          "vendor_id" int NOT NULL DEFAULT 0,
          "visits" int NOT NULL DEFAULT 0,
          "msisdn_resolved" int NOT NULL DEFAULT 0,
          "he_fail_cg" int NOT NULL DEFAULT 0,
          "otp_send" int NOT NULL DEFAULT 0,
          "otp_verify" int NOT NULL DEFAULT 0,
          "subscribe_success" int NOT NULL DEFAULT 0,
          "subscribe_failed" int NOT NULL DEFAULT 0,
          "postbacks_queued" int NOT NULL DEFAULT 0,
          "pending" int NOT NULL DEFAULT 0,
          "billing_received" int NOT NULL DEFAULT 0,
          "vendor_sent" int NOT NULL DEFAULT 0,
          "vendor_failed" int NOT NULL DEFAULT 0,
          "skipped" int NOT NULL DEFAULT 0,
          "unmatched_callbacks" int NOT NULL DEFAULT 0,
          "rolled_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_stats_grain"
        ON "daily_stats" ("stat_date", "timezone", "campaign_id", "vendor_id")
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_daily_stats_date"
        ON "daily_stats" ("stat_date")
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_daily_stats_campaign"
        ON "daily_stats" ("campaign_id", "stat_date")
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_daily_stats_vendor"
        ON "daily_stats" ("vendor_id", "stat_date")
      `);
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`daily_stats\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`stat_date\` varchar(10) NOT NULL,
        \`timezone\` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
        \`campaign_id\` int NOT NULL DEFAULT 0,
        \`vendor_id\` int NOT NULL DEFAULT 0,
        \`visits\` int NOT NULL DEFAULT 0,
        \`msisdn_resolved\` int NOT NULL DEFAULT 0,
        \`he_fail_cg\` int NOT NULL DEFAULT 0,
        \`otp_send\` int NOT NULL DEFAULT 0,
        \`otp_verify\` int NOT NULL DEFAULT 0,
        \`subscribe_success\` int NOT NULL DEFAULT 0,
        \`subscribe_failed\` int NOT NULL DEFAULT 0,
        \`postbacks_queued\` int NOT NULL DEFAULT 0,
        \`pending\` int NOT NULL DEFAULT 0,
        \`billing_received\` int NOT NULL DEFAULT 0,
        \`vendor_sent\` int NOT NULL DEFAULT 0,
        \`vendor_failed\` int NOT NULL DEFAULT 0,
        \`skipped\` int NOT NULL DEFAULT 0,
        \`unmatched_callbacks\` int NOT NULL DEFAULT 0,
        \`rolled_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_daily_stats_grain\` (\`stat_date\`, \`timezone\`, \`campaign_id\`, \`vendor_id\`),
        KEY \`IDX_daily_stats_date\` (\`stat_date\`),
        KEY \`IDX_daily_stats_campaign\` (\`campaign_id\`, \`stat_date\`),
        KEY \`IDX_daily_stats_vendor\` (\`vendor_id\`, \`stat_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query(`DROP TABLE IF EXISTS "daily_stats"`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS \`daily_stats\``);
    }
  }
}
