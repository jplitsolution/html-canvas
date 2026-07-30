#!/usr/bin/env node
/**
 * Apply postback + HE + CG columns.
 * Usage: node scripts/apply-postbacks-he.mjs
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
  await addColumn('vendors', 'postback_url', 'postback_url text');
  await addColumn('affiliates', 'postback_url', 'postback_url text');
  await addColumn('campaigns', 'cg_redirect_url', 'cg_redirect_url varchar(1024)');
  await addColumn('api_configs', 'he_provider', `he_provider varchar(32) DEFAULT 'header'`);
  await addColumn('api_configs', 'he_config_json', 'he_config_json text');

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversion_postbacks (
      id SERIAL PRIMARY KEY,
      visit_id int,
      campaign_id int,
      vendor_id int,
      affiliate_id int,
      msisdn varchar(64) NOT NULL,
      campid varchar(128),
      click_id varchar(255),
      offer_code varchar(128),
      postback_url text,
      status varchar(32) NOT NULL DEFAULT 'pending',
      http_status int,
      response_body text,
      error_message text,
      sent_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS IDX_postbacks_msisdn_status ON conversion_postbacks (msisdn, status)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS IDX_postbacks_visit ON conversion_postbacks (visit_id)`,
  );
  console.log('✓ conversion_postbacks');
  console.log('Done.');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
