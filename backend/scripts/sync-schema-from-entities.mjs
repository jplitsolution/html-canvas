#!/usr/bin/env node
/**
 * Align Postgres schema with TypeORM EntitySchemas (add missing tables/columns).
 * Safe-ish: synchronize adds missing structures; does not wipe data.
 *
 * Usage: node scripts/sync-schema-from-entities.mjs
 */
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { entities } from '../src/database/entities/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

async function main() {
  const ds = new DataSource({
    type: process.env.DB_TYPE || 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: true,
    logging: ['schema', 'error', 'warn'],
    entities,
  });

  console.log(
    `Syncing schema → ${process.env.DB_HOST}/${process.env.DB_DATABASE} as ${process.env.DB_USERNAME}`,
  );
  await ds.initialize();
  console.log('✓ TypeORM synchronize complete');

  const tables = await ds.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY 1
  `);
  console.log(
    'Tables:',
    tables.map((r) => r.tablename).join(', '),
  );

  await ds.destroy();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
