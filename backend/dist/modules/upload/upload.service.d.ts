import { ConfigService } from '@nestjs/config';
import { S3UploadService, StoredUploadResult } from './s3-upload.service';
import { LocalUploadService } from './local-upload.service';
export declare class UploadService {
    private readonly configService;
    private readonly s3UploadService;
    private readonly localUploadService;
    constructor(configService: ConfigService, s3UploadService: S3UploadService, localUploadService: LocalUploadService);
    uploadImage(file: Express.Multer.File, folder?: string): Promise<StoredUploadResult>;
    private isCloudinaryConfigured;
    private allowLocalFallback;
    private uploadToCloudinary;
}
