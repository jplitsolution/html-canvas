import { DataSource } from 'typeorm';
import { UserSchema } from '../modules/users/entities/user.entity.js';
import { TemplateSchema } from '../modules/templates/entities/template.entity.js';
import { VendorSchema } from '../modules/partners/entities/vendor.entity.js';
import { AffiliateSchema } from '../modules/partners/entities/affiliate.entity.js';
import { CountrySchema } from '../modules/markets/entities/country.entity.js';
import { OperatorSchema } from '../modules/markets/entities/operator.entity.js';
import { OtpRequestSchema } from '../modules/otp/entities/otp-request.entity.js';
import { CampaignSchema } from '../modules/campaigns/entities/campaign.entity.js';
import { CampaignTrackingSchema } from '../modules/campaigns/entities/campaign-tracking.entity.js';
import { CampaignPageSchema } from '../modules/campaigns/entities/campaign-page.entity.js';
import { ApiConfigSchema } from '../modules/api-config/entities/api-config.entity.js';
import { VisitSchema } from '../modules/analytics/entities/visit.entity.js';
import { VisitEventSchema } from '../modules/analytics/entities/visit-event.entity.js';
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
  OtpRequestSchema,
  CampaignSchema,
  CampaignTrackingSchema,
  CampaignPageSchema,
  ApiConfigSchema,
  VisitSchema,
  VisitEventSchema,
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
  return dataSource;
};

export const getDataSource = () => {
  if (!dataSource?.isInitialized) {
    throw new Error('Database DataSource has not been initialized yet.');
  }
  return dataSource;
};

export const getRepository = (entity) => {
  return getDataSource().getRepository(entity);
};
