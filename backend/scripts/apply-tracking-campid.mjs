#!/usr/bin/env node
/**
 * visits.campid (vendor) + visits.tracking_campid (ours)
 * conversion_postbacks.tracking_campid (ours); campid stays vendor
 *
 * Usage: node scripts/apply-tracking-campid.mjs
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

async function dropColumn(table, column) {
  if (!(await hasColumn(table, column))) return;
  await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column}`);
  console.log(`✓ dropped ${table}.${column}`);
}

async function main() {
  await client.connect();

  await addColumn('visits', 'campid', 'campid varchar(128)');
  await addColumn('visits', 'tracking_campid', 'tracking_campid varchar(128)');
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_VISIT_CAMPID" ON visits (campid)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_VISIT_TRACKING_CAMPID" ON visits (tracking_campid)`,
  );
  await dropColumn('visits', 'offer_id');

  await addColumn(
    'conversion_postbacks',
    'tracking_campid',
    'tracking_campid varchar(128)',
  );
  // Ensure vendor campid column exists (may have been renamed in aborted attempt).
  if (!(await hasColumn('conversion_postbacks', 'campid'))) {
    await addColumn('conversion_postbacks', 'campid', 'campid varchar(128)');
  } else {
    console.log('· conversion_postbacks.campid exists');
  }
  await dropColumn('conversion_postbacks', 'offer_id');
  await client.query(
    `CREATE INDEX IF NOT EXISTS "IDX_postbacks_campid" ON conversion_postbacks (campid)`,
  );

  console.log('Done.');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
