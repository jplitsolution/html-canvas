import { DataSource } from 'typeorm';
import getConfig from '../config/configuration.js';
import { entities } from './entities/index.js';

/** @type {DataSource | null} */
let dataSource = null;

export { entities };

export const initDatabase = async () => {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  const config = getConfig();
  const dbConfig = config.database;

  dataSource = new DataSource({
    type: dbConfig.type || 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    synchronize: false,
    logging: false,
    entities,
  });

  await dataSource.initialize();
  await ensureUserStatusColumn(dataSource);
  // Postbacks / HE base schema must exist before campid / unique-msisdn patches.
  await ensurePostbacksAndHeSchema(dataSource);
  await ensureRcidAndApiCallLogsSchema(dataSource);
  await ensureSuccessRedirectUrlColumn(dataSource);
  await ensureCampaignTrackingsSchema(dataSource);
  await ensureTrackingCampidColumns(dataSource);
  await ensureUniqueMsisdnOnPostbacks(dataSource);
  await ensureSuccessRedirectModeColumn(dataSource);
  await ensurePostbackRegisterAtColumn(dataSource);
  await ensureChecksubConfigJsonColumn(dataSource);
  return dataSource;
};

/**
 * Idempotent: conversion_postbacks + vendor/affiliate postback_url +
 * campaign cg_redirect_url + api_configs HE fields (migration 182).
 * Prod deploy without running TypeORM migrations hits 42P01 / 42703 otherwise.
 */
async function ensurePostbacksAndHeSchema(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  if (!isPostgres) return;
  try {
    await ds.query(`
      ALTER TABLE "vendors"
      ADD COLUMN IF NOT EXISTS "postback_url" text
    `);
    await ds.query(`
      ALTER TABLE "affiliates"
      ADD COLUMN IF NOT EXISTS "postback_url" text
    `);
    await ds.query(`
      ALTER TABLE "campaigns"
      ADD COLUMN IF NOT EXISTS "cg_redirect_url" varchar(1024)
    `);
    await ds.query(`
      ALTER TABLE "api_configs"
      ADD COLUMN IF NOT EXISTS "he_provider" varchar(32) DEFAULT 'header'
    `);
    await ds.query(`
      ALTER TABLE "api_configs"
      ADD COLUMN IF NOT EXISTS "he_config_json" text
    `);
    await ds.query(`
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
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_postbacks_visit"
      ON "conversion_postbacks" ("visit_id")
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_postbacks_campid"
      ON "conversion_postbacks" ("campid")
    `);
  } catch (err) {
    console.warn('ensurePostbacksAndHeSchema:', err.message);
  }
}

/** Idempotent: visits.rcid + postbacks.rcid + api_call_logs (migration 183). */
async function ensureRcidAndApiCallLogsSchema(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  if (!isPostgres) return;
  try {
    await ds.query(`
      ALTER TABLE "visits"
      ADD COLUMN IF NOT EXISTS "rcid" varchar
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_VISIT_RCID" ON "visits" ("rcid")
    `);
    await ds.query(`
      ALTER TABLE "conversion_postbacks"
      ADD COLUMN IF NOT EXISTS "rcid" varchar(255)
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_postbacks_rcid"
      ON "conversion_postbacks" ("rcid")
    `);
    await ds.query(`
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
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_msisdn"
      ON "api_call_logs" ("msisdn")
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_rcid"
      ON "api_call_logs" ("rcid")
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_click_id"
      ON "api_call_logs" ("click_id")
    `);
    await ds.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_visit_id"
      ON "api_call_logs" ("visit_id")
    `);
  } catch (err) {
    console.warn('ensureRcidAndApiCallLogsSchema:', err.message);
  }
}

/** Idempotent: campaigns.success_redirect_url (migration 184). */
async function ensureSuccessRedirectUrlColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "campaigns"
        ADD COLUMN IF NOT EXISTS "success_redirect_url" varchar(1024)
      `);
    }
  } catch (err) {
    console.warn('ensureSuccessRedirectUrlColumn:', err.message);
  }
}

/**
 * Idempotent: campaign_trackings.active + updated_at (migrations 180 / 181).
 * Prod was created from older trackings DDL without updated_at → campaigns list 500.
 */
async function ensureCampaignTrackingsSchema(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  if (!isPostgres) return;
  try {
    await ds.query(`
      ALTER TABLE "campaign_trackings"
      ADD COLUMN IF NOT EXISTS "active" boolean NOT NULL DEFAULT true
    `);
    await ds.query(`
      ALTER TABLE "campaign_trackings"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
  } catch (err) {
    console.warn('ensureCampaignTrackingsSchema:', err.message);
  }
}

/** Idempotent: campaign checksub status → continue/page/external rules. */
async function ensureChecksubConfigJsonColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "api_configs"
        ADD COLUMN IF NOT EXISTS "checksub_config_json" text
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_configs' AND COLUMN_NAME = 'checksub_config_json'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`api_configs\` ADD COLUMN \`checksub_config_json\` text NULL`,
        );
      }
    }
  } catch (err) {
    console.warn('ensureChecksubConfigJsonColumn:', err.message);
  }
}

/** Idempotent: thankyou | immediate after success / portal URL. */
async function ensureSuccessRedirectModeColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "campaigns"
        ADD COLUMN IF NOT EXISTS "success_redirect_mode" varchar(16) NOT NULL DEFAULT 'thankyou'
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'success_redirect_mode'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`success_redirect_mode\` varchar(16) NOT NULL DEFAULT 'thankyou'`,
        );
      }
    }
  } catch (err) {
    console.warn('ensureSuccessRedirectModeColumn:', err.message);
  }
}

/** Idempotent: confirm | otp | both — when to queue vendor CPA pending. */
async function ensurePostbackRegisterAtColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "campaigns"
        ADD COLUMN IF NOT EXISTS "postback_register_at" varchar(16) NOT NULL DEFAULT 'confirm'
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'postback_register_at'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`postback_register_at\` varchar(16) NOT NULL DEFAULT 'confirm'`,
        );
      }
    }
  } catch (err) {
    console.warn('ensurePostbackRegisterAtColumn:', err.message);
  }
}

/** Idempotent: users.status for admin user-management (active|inactive|suspended). */
async function ensureUserStatusColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "status" varchar(16) NOT NULL DEFAULT 'active'
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`users\` ADD COLUMN \`status\` varchar(16) NOT NULL DEFAULT 'active'`,
        );
      }
    }
  } catch (err) {
    console.warn('ensureUserStatusColumn:', err.message);
  }
}

/** Idempotent: vendor campid + our tracking_campid on visits / postbacks. */
async function ensureTrackingCampidColumns(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(
        `ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "campid" varchar(128)`,
      );
      await ds.query(
        `ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "tracking_campid" varchar(128)`,
      );
      await ds.query(
        `ALTER TABLE "conversion_postbacks" ADD COLUMN IF NOT EXISTS "tracking_campid" varchar(128)`,
      );
      await ds.query(
        `ALTER TABLE "conversion_postbacks" ADD COLUMN IF NOT EXISTS "campid" varchar(128)`,
      );
      await ds.query(`ALTER TABLE "visits" DROP COLUMN IF EXISTS "offer_id"`);
      await ds.query(
        `ALTER TABLE "conversion_postbacks" DROP COLUMN IF EXISTS "offer_id"`,
      );
    }
  } catch (err) {
    console.warn('ensureTrackingCampidColumns:', err.message);
  }
}

/** Idempotent: one conversion_postbacks row per msisdn. */
async function ensureUniqueMsisdnOnPostbacks(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        DELETE FROM "conversion_postbacks" a
        USING "conversion_postbacks" b
        WHERE a.msisdn = b.msisdn
          AND a.id < b.id
      `);
      await ds.query(`DROP INDEX IF EXISTS "IDX_postbacks_msisdn_status"`);
      await ds.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversion_postbacks_msisdn"
        ON "conversion_postbacks" ("msisdn")
      `);
    }
  } catch (err) {
    console.warn('ensureUniqueMsisdnOnPostbacks:', err.message);
  }
}

export const getDataSource = () => {
  if (!dataSource?.isInitialized) {
    throw new Error('Database DataSource has not been initialized yet.');
  }
  return dataSource;
};

export const getRepository = (entity) => {
  return getDataSource().getRepository(entity);
};
