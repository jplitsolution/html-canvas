#!/usr/bin/env node
/**
 * Apply SchemaCleanup1810000000000 against the configured Postgres DB.
 * Usage: node scripts/apply-schema-cleanup.mjs
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

async function columnExists(table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return r.rowCount > 0;
}

async function tableExists(table) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return r.rowCount > 0;
}

async function main() {
  await client.connect();
  console.log('Connected — applying schema cleanup…');

  if (await tableExists('otp_requests')) {
    await client.query(`DROP TABLE IF EXISTS otp_requests CASCADE`);
    console.log('✓ dropped otp_requests');
  } else {
    console.log('· otp_requests already gone');
  }

  if (await columnExists('api_configs', 'user_api')) {
    await client.query(`ALTER TABLE api_configs DROP COLUMN user_api`);
    console.log('✓ dropped api_configs.user_api');
  }
  if (await columnExists('api_configs', 'otp_provider')) {
    await client.query(`ALTER TABLE api_configs DROP COLUMN otp_provider`);
    console.log('✓ dropped api_configs.otp_provider');
  }

  const delPages = await client.query(`
    DELETE FROM campaign_pages
    WHERE page_type IN ('LANDING', 'OTP_PROMPT', 'SUCCESS', 'PLAN')
  `);
  console.log(`✓ removed ${delPages.rowCount} legacy campaign_pages`);

  if (!(await columnExists('campaign_trackings', 'updated_at'))) {
    await client.query(`
      ALTER TABLE campaign_trackings
      ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT now()
    `);
    console.log('✓ added campaign_trackings.updated_at');
  }

  await client.query(`
    DELETE FROM campaign_trackings a
    USING campaign_trackings b
    WHERE a.id > b.id
      AND a.campaign_id = b.campaign_id
      AND a.vendor_id = b.vendor_id
      AND COALESCE(a.affiliate_id, 0) = COALESCE(b.affiliate_id, 0)
  `);

  await client.query(`
    DROP INDEX IF EXISTS "UQ_campaign_trackings_camp_vendor_aff"
  `);
  await client.query(`
    CREATE UNIQUE INDEX "UQ_campaign_trackings_camp_vendor_aff"
    ON campaign_trackings (campaign_id, vendor_id, (COALESCE(affiliate_id, 0)))
  `);
  console.log('✓ unique index on campaign_trackings');

  // Record migration if migrations table exists
  if (await tableExists('migrations')) {
    await client.query(`
      INSERT INTO migrations (timestamp, name)
      SELECT 1810000000000, 'SchemaCleanup1810000000000'
      WHERE NOT EXISTS (
        SELECT 1 FROM migrations WHERE name = 'SchemaCleanup1810000000000'
      )
    `);
  }

  console.log('Schema cleanup done.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
