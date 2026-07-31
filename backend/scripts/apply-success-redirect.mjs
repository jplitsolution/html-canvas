#!/usr/bin/env node
/**
 * Apply campaigns.success_redirect_url.
 * Usage: node scripts/apply-success-redirect.mjs
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

async function main() {
  await client.connect();
  if (await hasColumn('campaigns', 'success_redirect_url')) {
    console.log('· campaigns.success_redirect_url exists');
  } else {
    await client.query(
      `ALTER TABLE campaigns ADD COLUMN success_redirect_url varchar(1024)`,
    );
    console.log('✓ campaigns.success_redirect_url');
  }
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
