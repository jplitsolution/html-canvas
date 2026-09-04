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

  const isPostgres = (dbConfig.type || 'postgres') === 'postgres';
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
    extra: isPostgres
      ? { max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 }
      : { connectionLimit: 20, waitForConnections: true },
  });

  await dataSource.initialize();
  await ensureUserStatusColumn(dataSource);
  // Postbacks / HE base schema must exist before campid / unique-msisdn patches.
  await ensurePostbacksAndHeSchema(dataSource);
  await ensureRcidAndApiCallLogsSchema(dataSource);
  await ensureSuccessRedirectUrlColumn(dataSource);
  await ensureCampaignTrackingsSchema(dataSource);
  await ensureTrackingPayoutPercentColumn(dataSource);
  await ensureTrackingCampidColumns(dataSource);
  await ensureUniqueMsisdnOnPostbacks(dataSource);
  await ensureNullableMsisdnOnPostbacks(dataSource);
  await ensureOperatorStatusOnPostbacks(dataSource);
  await ensureSuccessRedirectModeColumn(dataSource);
  await ensurePostbackRegisterAtColumn(dataSource);
  await ensureChecksubConfigJsonColumn(dataSource);
  await ensureDcbConfigJsonColumn(dataSource);
  await ensureFunnelLayoutColumn(dataSource);
  await ensureDailyStatsTable(dataSource);
  await ensureOperatorStatusJsonOnDailyStats(dataSource);
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
        "msisdn" varchar(64),
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

/** Idempotent: per-vendor OTP expose payout % (migration 195). */
async function ensureTrackingPayoutPercentColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "campaign_trackings"
        ADD COLUMN IF NOT EXISTS "payout_percent" int NOT NULL DEFAULT 100
      `);
      return;
    }
    const rows = await ds.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'campaign_trackings' AND COLUMN_NAME = 'payout_percent'`,
    );
    const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
    if (!cnt) {
      await ds.query(
        `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`payout_percent\` int NOT NULL DEFAULT 100`,
      );
    }
  } catch (err) {
    console.warn('ensureTrackingPayoutPercentColumn:', err.message);
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

/** Idempotent: Universe Telecom DCB provider and normalizer configuration. */
async function ensureDcbConfigJsonColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "api_configs"
        ADD COLUMN IF NOT EXISTS "dcb_config_json" text
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_configs' AND COLUMN_NAME = 'dcb_config_json'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`api_configs\` ADD COLUMN \`dcb_config_json\` text NULL`,
        );
      }
    }
  } catch (err) {
    console.warn('ensureDcbConfigJsonColumn:', err.message);
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

/** Idempotent: classic | packs_on_home — identity-before-HOME routing. */
async function ensureFunnelLayoutColumn(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "campaigns"
        ADD COLUMN IF NOT EXISTS "funnel_layout" varchar(32) NOT NULL DEFAULT 'classic'
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'funnel_layout'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`funnel_layout\` varchar(32) NOT NULL DEFAULT 'classic'`,
        );
      }
    }
  } catch (err) {
    console.warn('ensureFunnelLayoutColumn:', err.message);
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

/** Operator billing status from callback (active, grace, parking, …). */
async function ensureOperatorStatusOnPostbacks(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "conversion_postbacks"
        ADD COLUMN IF NOT EXISTS "operator_status" varchar(64)
      `);
      await ds.query(`
        CREATE INDEX IF NOT EXISTS "IDX_postbacks_operator_status"
        ON "conversion_postbacks" ("operator_status")
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversion_postbacks' AND COLUMN_NAME = 'operator_status'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`operator_status\` varchar(64) NULL`,
        );
      }
    }
  } catch (err) {
    console.warn('ensureOperatorStatusOnPostbacks:', err.message);
  }
}

/** CG / click_id-only callbacks: store conversion row before MSISDN is known. */
async function ensureNullableMsisdnOnPostbacks(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(
        `ALTER TABLE "conversion_postbacks" ALTER COLUMN "msisdn" DROP NOT NULL`,
      );
      await ds.query(`
        CREATE INDEX IF NOT EXISTS "IDX_postbacks_click_id"
        ON "conversion_postbacks" ("click_id")
      `);
    }
  } catch (err) {
    console.warn('ensureNullableMsisdnOnPostbacks:', err.message);
  }
}

/** Idempotent: daily KPI rollup for reports (date × campaign × vendor). */
async function ensureDailyStatsTable(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        CREATE TABLE IF NOT EXISTS "daily_stats" (
          "id" SERIAL PRIMARY KEY,
          "stat_date" varchar(10) NOT NULL,
          "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
          "campaign_id" int NOT NULL DEFAULT 0,
          "vendor_id" int NOT NULL DEFAULT 0,
          "visits" int NOT NULL DEFAULT 0,
          "msisdn_resolved" int NOT NULL DEFAULT 0,
          "he_fail_cg" int NOT NULL DEFAULT 0,
          "otp_send" int NOT NULL DEFAULT 0,
          "otp_verify" int NOT NULL DEFAULT 0,
          "subscribe_success" int NOT NULL DEFAULT 0,
          "subscribe_failed" int NOT NULL DEFAULT 0,
          "postbacks_queued" int NOT NULL DEFAULT 0,
          "pending" int NOT NULL DEFAULT 0,
          "billing_received" int NOT NULL DEFAULT 0,
          "vendor_sent" int NOT NULL DEFAULT 0,
          "vendor_failed" int NOT NULL DEFAULT 0,
          "skipped" int NOT NULL DEFAULT 0,
          "unmatched_callbacks" int NOT NULL DEFAULT 0,
          "rolled_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await ds.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_stats_grain"
        ON "daily_stats" ("stat_date", "timezone", "campaign_id", "vendor_id")
      `);
      await ds.query(`
        CREATE INDEX IF NOT EXISTS "IDX_daily_stats_date"
        ON "daily_stats" ("stat_date")
      `);
      await ds.query(`
        CREATE INDEX IF NOT EXISTS "IDX_daily_stats_campaign"
        ON "daily_stats" ("campaign_id", "stat_date")
      `);
      await ds.query(`
        CREATE INDEX IF NOT EXISTS "IDX_daily_stats_vendor"
        ON "daily_stats" ("vendor_id", "stat_date")
      `);
      return;
    }

    const tables = await ds.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_stats'`,
    );
    const exists = Number(tables?.[0]?.cnt ?? tables?.[0]?.CNT ?? 0);
    if (exists) return;
    await ds.query(`
      CREATE TABLE \`daily_stats\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`stat_date\` varchar(10) NOT NULL,
        \`timezone\` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
        \`campaign_id\` int NOT NULL DEFAULT 0,
        \`vendor_id\` int NOT NULL DEFAULT 0,
        \`visits\` int NOT NULL DEFAULT 0,
        \`msisdn_resolved\` int NOT NULL DEFAULT 0,
        \`he_fail_cg\` int NOT NULL DEFAULT 0,
        \`otp_send\` int NOT NULL DEFAULT 0,
        \`otp_verify\` int NOT NULL DEFAULT 0,
        \`subscribe_success\` int NOT NULL DEFAULT 0,
        \`subscribe_failed\` int NOT NULL DEFAULT 0,
        \`postbacks_queued\` int NOT NULL DEFAULT 0,
        \`pending\` int NOT NULL DEFAULT 0,
        \`billing_received\` int NOT NULL DEFAULT 0,
        \`vendor_sent\` int NOT NULL DEFAULT 0,
        \`vendor_failed\` int NOT NULL DEFAULT 0,
        \`skipped\` int NOT NULL DEFAULT 0,
        \`unmatched_callbacks\` int NOT NULL DEFAULT 0,
        \`rolled_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_daily_stats_grain\` (\`stat_date\`, \`timezone\`, \`campaign_id\`, \`vendor_id\`),
        KEY \`IDX_daily_stats_date\` (\`stat_date\`),
        KEY \`IDX_daily_stats_campaign\` (\`campaign_id\`, \`stat_date\`),
        KEY \`IDX_daily_stats_vendor\` (\`vendor_id\`, \`stat_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    console.warn('ensureDailyStatsTable:', err.message);
  }
}

/** Operator callback mix (grace/active/…) rolled into daily_stats from api_call_logs. */
async function ensureOperatorStatusJsonOnDailyStats(ds) {
  const isPostgres = (ds.options.type || 'postgres') === 'postgres';
  try {
    if (isPostgres) {
      await ds.query(`
        ALTER TABLE "daily_stats"
        ADD COLUMN IF NOT EXISTS "operator_status_json" jsonb
      `);
    } else {
      const rows = await ds.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_stats' AND COLUMN_NAME = 'operator_status_json'`,
      );
      const cnt = Number(rows?.[0]?.cnt ?? rows?.[0]?.CNT ?? 0);
      if (!cnt) {
        await ds.query(
          `ALTER TABLE \`daily_stats\` ADD COLUMN \`operator_status_json\` json NULL`,
        );
      }
    }
  } catch (err) {
    console.warn('ensureOperatorStatusJsonOnDailyStats:', err.message);
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
