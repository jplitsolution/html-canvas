import { DataSource } from 'typeorm';
import { UserSchema } from '../modules/users/entities/user.entity.js';
import { TemplateSchema } from '../modules/templates/entities/template.entity.js';
import { VendorSchema } from '../modules/partners/entities/vendor.entity.js';
import { AffiliateSchema } from '../modules/partners/entities/affiliate.entity.js';
import { CountrySchema } from '../modules/markets/entities/country.entity.js';
import { OperatorSchema } from '../modules/markets/entities/operator.entity.js';
import { CampaignSchema } from '../modules/campaigns/entities/campaign.entity.js';
import { CampaignTrackingSchema } from '../modules/campaigns/entities/campaign-tracking.entity.js';
import { CampaignPageSchema } from '../modules/campaigns/entities/campaign-page.entity.js';
import { ApiConfigSchema } from '../modules/api-config/entities/api-config.entity.js';
import { VisitSchema } from '../modules/analytics/entities/visit.entity.js';
import { VisitEventSchema } from '../modules/analytics/entities/visit-event.entity.js';
import { ConversionPostbackSchema } from '../modules/partners/entities/conversion-postback.entity.js';
import { ApiCallLogSchema } from '../modules/flow/entities/api-call-log.entity.js';
import getConfig from '../config/configuration.js';

/** @type {DataSource | null} */
let dataSource = null;

export const entities = [
  UserSchema,
  TemplateSchema,
  VendorSchema,
  AffiliateSchema,
  CountrySchema,
  OperatorSchema,
  CampaignSchema,
  CampaignTrackingSchema,
  CampaignPageSchema,
  ApiConfigSchema,
  VisitSchema,
  VisitEventSchema,
  ConversionPostbackSchema,
  ApiCallLogSchema,
];

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
  return dataSource;
};

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
