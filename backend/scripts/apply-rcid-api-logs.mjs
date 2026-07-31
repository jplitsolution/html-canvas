#!/usr/bin/env node
/**
 * Apply visits.rcid, conversion_postbacks.rcid, api_call_logs.
 * Usage: node scripts/apply-rcid-api-logs.mjs
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

async function hasColumn(table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return r.rowCount > 0;
}

async function addColumn(table, column, ddl) {
  if (await hasColumn(table, column)) {
    console.log(`· ${table}.${column} exists`);
    return;
  }
  await client.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  console.log(`✓ ${table}.${column}`);
}

async function main() {
  await client.connect();
  await addColumn('visits', 'rcid', 'rcid varchar');
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_VISIT_RCID" ON visits (rcid)`,
  );
  await addColumn('conversion_postbacks', 'rcid', 'rcid varchar(255)');
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_postbacks_rcid" ON conversion_postbacks (rcid)`,
  );

  await client.query(`
    CREATE TABLE IF NOT EXISTS api_call_logs (
      id SERIAL PRIMARY KEY,
      visit_id int,
      campaign_id int,
      msisdn varchar(64),
      rcid varchar(255),
      click_id varchar(255),
      call_type varchar(32) NOT NULL,
      request_url text,
      request_body text,
      response_status int,
      response_body text,
      success boolean,
      error_message text,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_msisdn" ON api_call_logs (msisdn)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_rcid" ON api_call_logs (rcid)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_click_id" ON api_call_logs (click_id)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_visit_id" ON api_call_logs (visit_id)`,
  );
  console.log('✓ api_call_logs');
  console.log('Done.');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
