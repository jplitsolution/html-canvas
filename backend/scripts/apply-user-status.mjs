#!/usr/bin/env node
/**
 * Apply users.status column.
 * Usage: node scripts/apply-user-status.mjs
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
  if (await hasColumn('users', 'status')) {
    console.log('· users.status exists');
  } else {
    await client.query(
      `ALTER TABLE users ADD COLUMN status varchar(16) NOT NULL DEFAULT 'active'`,
    );
    console.log('✓ users.status');
  }
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
