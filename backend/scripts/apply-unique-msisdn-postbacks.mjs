#!/usr/bin/env node
/**
 * conversion_postbacks: dedupe by msisdn (keep latest id) + UNIQUE(msisdn).
 * Usage: node scripts/apply-unique-msisdn-postbacks.mjs
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

async function main() {
  await client.connect();
  console.log('Connected — applying unique msisdn on conversion_postbacks…');

  const before = await client.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE msisdn IN (
               SELECT msisdn FROM conversion_postbacks
               GROUP BY msisdn HAVING COUNT(*) > 1
             )
           )::int AS dup_rows
    FROM conversion_postbacks
  `);
  console.log(
    `· rows=${before.rows[0].total}, duplicate-msisdn rows=${before.rows[0].dup_rows}`,
  );

  const del = await client.query(`
    DELETE FROM conversion_postbacks a
    USING conversion_postbacks b
    WHERE a.msisdn = b.msisdn
      AND a.id < b.id
  `);
  console.log(`✓ deleted ${del.rowCount} duplicate row(s) (kept latest id)`);

  await client.query(`DROP INDEX IF EXISTS "IDX_postbacks_msisdn_status"`);
  console.log('✓ dropped IDX_postbacks_msisdn_status (if existed)');

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversion_postbacks_msisdn"
    ON conversion_postbacks (msisdn)
  `);
  console.log('✓ UQ_conversion_postbacks_msisdn');

  const check = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'conversion_postbacks'
      AND indexname = 'UQ_conversion_postbacks_msisdn'
  `);
  if (!check.rowCount) {
    throw new Error('Unique index not found after create');
  }
  console.log('Done.', check.rows[0].indexdef);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
