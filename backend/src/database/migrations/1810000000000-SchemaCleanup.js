/**
 * Schema cleanup aligned with docs/WAP_MANAGER_DESIGN.md
 * - Drop otp_requests (partner-only OTP)
 * - Drop api_configs.user_api, api_configs.otp_provider
 * - Remove legacy campaign page types
 * - Harden campaign_trackings (updated_at + unique)
 */
export class SchemaCleanup1810000000000 {
  name = 'SchemaCleanup1810000000000';

  async safeQuery(queryRunner, sql) {
    try {
      await queryRunner.query(sql);
    } catch (err) {
      // Idempotent cleanup — ignore "already gone" style errors
      if (!/does not exist|unknown column|Duplicate|already exists/i.test(err.message)) {
        throw err;
      }
    }
  }

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS "otp_requests" CASCADE`);

      if (await queryRunner.hasColumn('api_configs', 'user_api')) {
        await queryRunner.query(`ALTER TABLE "api_configs" DROP COLUMN "user_api"`);
      }
      if (await queryRunner.hasColumn('api_configs', 'otp_provider')) {
        await queryRunner.query(`ALTER TABLE "api_configs" DROP COLUMN "otp_provider"`);
      }

      await queryRunner.query(`
        DELETE FROM "campaign_pages"
        WHERE "page_type" IN ('LANDING', 'OTP_PROMPT', 'SUCCESS', 'PLAN')
      `);

      if (!(await queryRunner.hasColumn('campaign_trackings', 'updated_at'))) {
        await queryRunner.query(`
          ALTER TABLE "campaign_trackings"
          ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        `);
      }

      // Deduplicate trackings before unique index
      await queryRunner.query(`
        DELETE FROM "campaign_trackings" a
        USING "campaign_trackings" b
        WHERE a.id > b.id
          AND a.campaign_id = b.campaign_id
          AND a.vendor_id = b.vendor_id
          AND COALESCE(a.affiliate_id, 0) = COALESCE(b.affiliate_id, 0)
      `);

      await this.safeQuery(
        queryRunner,
        `CREATE UNIQUE INDEX "UQ_campaign_trackings_camp_vendor_aff"
         ON "campaign_trackings" ("campaign_id", "vendor_id", (COALESCE("affiliate_id", 0)))`,
      );

      // Backfill operator_id gaps is done in seed; enforce NOT NULL only when all rows have it
      const nullOps = await queryRunner.query(
        `SELECT COUNT(*)::int AS c FROM "campaigns" WHERE "operator_id" IS NULL`,
      );
      if (Number(nullOps[0]?.c || 0) === 0) {
        await this.safeQuery(
          queryRunner,
          `ALTER TABLE "campaigns" ALTER COLUMN "operator_id" SET NOT NULL`,
        );
      }
    } else {
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS \`otp_requests\``);

      if (await queryRunner.hasColumn('api_configs', 'user_api')) {
        await queryRunner.query(`ALTER TABLE \`api_configs\` DROP COLUMN \`user_api\``);
      }
      if (await queryRunner.hasColumn('api_configs', 'otp_provider')) {
        await queryRunner.query(`ALTER TABLE \`api_configs\` DROP COLUMN \`otp_provider\``);
      }

      await queryRunner.query(`
        DELETE FROM \`campaign_pages\`
        WHERE \`page_type\` IN ('LANDING', 'OTP_PROMPT', 'SUCCESS', 'PLAN')
      `);

      if (!(await queryRunner.hasColumn('campaign_trackings', 'updated_at'))) {
        await queryRunner.query(`
          ALTER TABLE \`campaign_trackings\`
          ADD COLUMN \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
            ON UPDATE CURRENT_TIMESTAMP(6)
        `);
      }
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await this.safeQuery(
        queryRunner,
        `DROP INDEX IF EXISTS "UQ_campaign_trackings_camp_vendor_aff"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "api_configs" ADD COLUMN IF NOT EXISTS "user_api" varchar`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "api_configs" ADD COLUMN IF NOT EXISTS "otp_provider" varchar(32)`,
      );
    }
  }
}
