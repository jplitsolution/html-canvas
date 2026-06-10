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
export interface AppConfig {
    port: number;
    environment: string;
    database: DatabaseConfig;
    jwt: JwtConfig;
    cloudinary: CloudinaryConfig;
}
declare const _default: () => AppConfig;
export default _default;
