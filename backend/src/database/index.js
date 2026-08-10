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
  await ensureTrackingCampidColumns(dataSource);
  await ensureUniqueMsisdnOnPostbacks(dataSource);
  await ensureSuccessRedirectModeColumn(dataSource);
  await ensurePostbackRegisterAtColumn(dataSource);
  await ensureChecksubConfigJsonColumn(dataSource);
  return dataSource;
};

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
