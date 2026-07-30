/**
 * conversion_postbacks — pending affiliate CPA callbacks (SAFWAP callback_manage parity)
 * + vendor/affiliate postback_url
 * + campaign cg_redirect_url
 * + api_configs HE provider fields
 */
export class AddPostbacksAndHe1820000000000 {
  name = 'AddPostbacksAndHe1820000000000';

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
      if (!(await queryRunner.hasColumn('vendors', 'postback_url'))) {
        await queryRunner.query(
          `ALTER TABLE "vendors" ADD COLUMN "postback_url" text`,
        );
      }
      if (!(await queryRunner.hasColumn('affiliates', 'postback_url'))) {
        await queryRunner.query(
          `ALTER TABLE "affiliates" ADD COLUMN "postback_url" text`,
        );
      }
      if (!(await queryRunner.hasColumn('campaigns', 'cg_redirect_url'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "cg_redirect_url" varchar(1024)`,
        );
      }
      if (!(await queryRunner.hasColumn('api_configs', 'he_provider'))) {
        await queryRunner.query(
          `ALTER TABLE "api_configs" ADD COLUMN "he_provider" varchar(32) DEFAULT 'header'`,
        );
      }
      if (!(await queryRunner.hasColumn('api_configs', 'he_config_json'))) {
        await queryRunner.query(
          `ALTER TABLE "api_configs" ADD COLUMN "he_config_json" text`,
        );
      }

      await this.safeQuery(
        queryRunner,
        `
        CREATE TABLE IF NOT EXISTS "conversion_postbacks" (
          "id" SERIAL PRIMARY KEY,
          "visit_id" int,
          "campaign_id" int,
          "vendor_id" int,
          "affiliate_id" int,
          "msisdn" varchar(64) NOT NULL,
          "campid" varchar(128),
          "click_id" varchar(255),
          "offer_code" varchar(128),
          "postback_url" text,
          "status" varchar(32) NOT NULL DEFAULT 'pending',
          "http_status" int,
          "response_body" text,
          "error_message" text,
          "sent_at" TIMESTAMP,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_msisdn_status" ON "conversion_postbacks" ("msisdn", "status")`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_visit" ON "conversion_postbacks" ("visit_id")`,
      );
    } else {
      // MySQL branch kept minimal — prod path is Postgres
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`vendors\` ADD COLUMN \`postback_url\` text NULL`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS "conversion_postbacks"`);
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "vendors" DROP COLUMN IF EXISTS "postback_url"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "affiliates" DROP COLUMN IF EXISTS "postback_url"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "cg_redirect_url"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "api_configs" DROP COLUMN IF EXISTS "he_provider"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "api_configs" DROP COLUMN IF EXISTS "he_config_json"`,
      );
    }
  }
}
