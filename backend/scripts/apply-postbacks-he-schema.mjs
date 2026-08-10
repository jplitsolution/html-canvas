#!/usr/bin/env node
/**
 * Apply missing postbacks / HE / rcid schema on production Postgres.
 * Safe to re-run (IF NOT EXISTS).
 *
 * Usage (on server, from backend/):
 *   node scripts/apply-postbacks-he-schema.mjs
 *
 * Or: npm run db:postbacks-he
 */
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function run(label, sql) {
  await client.query(sql);
  console.log(`✓ ${label}`);
}

async function main() {
  await client.connect();
  console.log(
    `Connected ${process.env.DB_HOST}/${process.env.DB_DATABASE} — applying postbacks/HE schema…`,
  );

  await run(
    'vendors.postback_url',
    `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "postback_url" text`,
  );
  await run(
    'affiliates.postback_url',
    `ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "postback_url" text`,
  );
  await run(
    'campaigns.cg_redirect_url',
    `ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "cg_redirect_url" varchar(1024)`,
  );
  await run(
    'campaigns.success_redirect_url',
    `ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "success_redirect_url" varchar(1024)`,
  );
  await run(
    'campaigns.success_redirect_mode',
    `ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "success_redirect_mode" varchar(16) NOT NULL DEFAULT 'thankyou'`,
  );
  await run(
    'campaigns.postback_register_at',
    `ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "postback_register_at" varchar(16) NOT NULL DEFAULT 'confirm'`,
  );
  await run(
    'api_configs.he_provider',
    `ALTER TABLE "api_configs" ADD COLUMN IF NOT EXISTS "he_provider" varchar(32) DEFAULT 'header'`,
  );
  await run(
    'api_configs.he_config_json',
    `ALTER TABLE "api_configs" ADD COLUMN IF NOT EXISTS "he_config_json" text`,
  );
  await run(
    'api_configs.checksub_config_json',
    `ALTER TABLE "api_configs" ADD COLUMN IF NOT EXISTS "checksub_config_json" text`,
  );

  await run(
    'conversion_postbacks table',
    `
    CREATE TABLE IF NOT EXISTS "conversion_postbacks" (
      "id" SERIAL PRIMARY KEY,
      "visit_id" int,
      "campaign_id" int,
      "vendor_id" int,
      "affiliate_id" int,
      "msisdn" varchar(64) NOT NULL,
      "campid" varchar(128),
      "tracking_campid" varchar(128),
      "click_id" varchar(255),
      "rcid" varchar(255),
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
  await run(
    'conversion_postbacks.rcid',
    `ALTER TABLE "conversion_postbacks" ADD COLUMN IF NOT EXISTS "rcid" varchar(255)`,
  );
  await run(
    'conversion_postbacks.tracking_campid',
    `ALTER TABLE "conversion_postbacks" ADD COLUMN IF NOT EXISTS "tracking_campid" varchar(128)`,
  );
  await run(
    'conversion_postbacks.campid',
    `ALTER TABLE "conversion_postbacks" ADD COLUMN IF NOT EXISTS "campid" varchar(128)`,
  );
  await run(
    'IDX_postbacks_visit',
    `CREATE INDEX IF NOT EXISTS "IDX_postbacks_visit" ON "conversion_postbacks" ("visit_id")`,
  );
  await run(
    'IDX_postbacks_campid',
    `CREATE INDEX IF NOT EXISTS "IDX_postbacks_campid" ON "conversion_postbacks" ("campid")`,
  );
  await run(
    'IDX_postbacks_rcid',
    `CREATE INDEX IF NOT EXISTS "IDX_postbacks_rcid" ON "conversion_postbacks" ("rcid")`,
  );

  await run(
    'visits.rcid',
    `ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "rcid" varchar`,
  );
  await run(
    'visits.campid',
    `ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "campid" varchar(128)`,
  );
  await run(
    'visits.tracking_campid',
    `ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "tracking_campid" varchar(128)`,
  );
  await run(
    'IDX_VISIT_RCID',
    `CREATE INDEX IF NOT EXISTS "IDX_VISIT_RCID" ON "visits" ("rcid")`,
  );

  await run(
    'api_call_logs table',
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
  await run(
    'IDX_api_call_logs_msisdn',
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_msisdn" ON "api_call_logs" ("msisdn")`,
  );
  await run(
    'IDX_api_call_logs_rcid',
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_rcid" ON "api_call_logs" ("rcid")`,
  );
  await run(
    'IDX_api_call_logs_click_id',
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_click_id" ON "api_call_logs" ("click_id")`,
  );
  await run(
    'IDX_api_call_logs_visit_id',
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_visit_id" ON "api_call_logs" ("visit_id")`,
  );

  // Unique msisdn on postbacks (skip if empty table / no dupes)
  try {
    await client.query(`
      DELETE FROM "conversion_postbacks" a
      USING "conversion_postbacks" b
      WHERE a.msisdn = b.msisdn AND a.id < b.id
    `);
    await client.query(`DROP INDEX IF EXISTS "IDX_postbacks_msisdn_status"`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversion_postbacks_msisdn"
      ON "conversion_postbacks" ("msisdn")
    `);
    console.log('✓ UQ_conversion_postbacks_msisdn');
  } catch (err) {
    console.warn('· unique msisdn index:', err.message);
  }

  console.log('Done.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
