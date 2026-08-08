import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Always load backend/.env (cwd can differ under node --watch / process managers).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  otpExposeTest: process.env.OTP_EXPOSE_TEST === 'true',
  // Local/dev HE: when set, used as MSISDN if no real header/query phone is present.
  heDummyMsisdn: String(process.env.HE_DUMMY_MSISDN || '').replace(/\D/g, ''),
  database: {
    type: process.env.DB_TYPE || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(
      process.env.DB_PORT ||
        (process.env.DB_TYPE === 'postgres' ? '5432' : '3306'),
      10,
    ),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'templatecraft',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_key',
    expiresIn: process.env.JWT_EXPIRATION || '24h',
  },
  // Single dashboard admin (email match). Everyone else is a normal user.
  adminEmail: String(process.env.ADMIN_EMAIL || '')
    .trim()
    .toLowerCase(),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    cloudfrontUrl: process.env.AWS_CLOUDFRONT_URL || '',
    s3Prefix: process.env.AWS_S3_PREFIX || 'templatecraft',
  },
  uploads: {
    localDir: process.env.UPLOAD_LOCAL_DIR || '',
    publicPath: process.env.UPLOAD_PUBLIC_PATH || '/api/media',
    prefix: process.env.UPLOAD_PREFIX || 'templatecraft',
  },
  search: {
    node: process.env.ELASTICSEARCH_NODE || '',
    enabled: Boolean(process.env.ELASTICSEARCH_NODE),
    index: process.env.ELASTICSEARCH_INDEX || 'campaign_events',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  // Flow campaign / apiConfig Redis cache. Set FLOW_CACHE_ENABLED=false to always hit DB.
  flowCacheEnabled:
    String(process.env.FLOW_CACHE_ENABLED ?? 'true').toLowerCase() !== 'false',
  // Campaign + pages + apiConfig TTL (seconds). Edit paths invalidate immediately.
  flowCacheTtlSeconds: Math.max(
    30,
    parseInt(process.env.FLOW_CACHE_TTL_SECONDS || '600', 10) || 600,
  ),
  archiveRetentionDays: parseInt(
    process.env.ARCHIVE_RETENTION_DAYS || '30',
    10,
  ),
});
