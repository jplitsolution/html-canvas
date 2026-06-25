export interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  database: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  s3Bucket: string;
  cloudfrontUrl: string;
  s3Prefix: string;
}

export interface UploadsConfig {
  localDir: string;
  publicPath: string;
  prefix: string;
}

export interface AppConfig {
  port: number;
  environment: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cloudinary: CloudinaryConfig;
  aws: AwsConfig;
  uploads: UploadsConfig;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    type: process.env.DB_TYPE || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (process.env.DB_TYPE === 'postgres' ? '5432' : '3306'), 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'templatecraft',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_key',
    expiresIn: process.env.JWT_EXPIRATION || '24h',
  },
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
});
