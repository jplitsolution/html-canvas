/**
 * All TypeORM entity schemas — single source of truth for DB models.
 * Import from here or from individual files under database/entities/.
 */
export { User, UserSchema } from './user.entity.js';
export { Template, TemplateSchema } from './template.entity.js';
export { Vendor, VendorSchema } from './vendor.entity.js';
export { Affiliate, AffiliateSchema } from './affiliate.entity.js';
export {
  ConversionPostback,
  ConversionPostbackSchema,
} from './conversion-postback.entity.js';
export { Country, CountrySchema } from './country.entity.js';
export { Operator, OperatorSchema } from './operator.entity.js';
export { Campaign, CampaignSchema } from './campaign.entity.js';
export {
  CampaignTracking,
  CampaignTrackingSchema,
} from './campaign-tracking.entity.js';
export {
  CampaignPage,
  CampaignPageSchema,
  CampaignPageType,
  ALL_CAMPAIGN_PAGE_TYPES,
  REQUIRED_CAMPAIGN_PAGE_TYPES,
} from './campaign-page.entity.js';
export { ApiConfig, ApiConfigSchema } from './api-config.entity.js';
export { Visit, VisitSchema, VisitStatus } from './visit.entity.js';
export {
  VisitEvent,
  VisitEventSchema,
  VisitEventType,
} from './visit-event.entity.js';
export {
  ApiCallLog,
  ApiCallLogSchema,
  ApiCallType,
} from './api-call-log.entity.js';
export { DailyStat, DailyStatSchema } from './daily-stat.entity.js';

import { UserSchema } from './user.entity.js';
import { TemplateSchema } from './template.entity.js';
import { VendorSchema } from './vendor.entity.js';
import { AffiliateSchema } from './affiliate.entity.js';
import { ConversionPostbackSchema } from './conversion-postback.entity.js';
import { CountrySchema } from './country.entity.js';
import { OperatorSchema } from './operator.entity.js';
import { CampaignSchema } from './campaign.entity.js';
import { CampaignTrackingSchema } from './campaign-tracking.entity.js';
import { CampaignPageSchema } from './campaign-page.entity.js';
import { ApiConfigSchema } from './api-config.entity.js';
import { VisitSchema } from './visit.entity.js';
import { VisitEventSchema } from './visit-event.entity.js';
import { ApiCallLogSchema } from './api-call-log.entity.js';
import { DailyStatSchema } from './daily-stat.entity.js';

/** Registered with TypeORM DataSource */
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
  DailyStatSchema,
];
