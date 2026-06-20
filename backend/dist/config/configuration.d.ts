export interface DatabaseConfig {
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
declare const _default: () => AppConfig;
export default _default;
