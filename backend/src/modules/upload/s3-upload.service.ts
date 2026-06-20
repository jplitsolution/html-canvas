import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export interface StoredUploadResult {
  url: string;
  key: string;
  format: string;
  bytes: number;
}

@Injectable()
export class S3UploadService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly cloudfrontUrl: string;
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region') || 'ap-south-1';
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');

    this.bucket = this.configService.get<string>('aws.s3Bucket') || '';
    this.cloudfrontUrl = (this.configService.get<string>('aws.cloudfrontUrl') || '').replace(/\/$/, '');
    this.prefix = (this.configService.get<string>('aws.s3Prefix') || 'templatecraft').replace(/^\/+|\/+$/g, '');

    this.client =
      this.bucket && accessKeyId && secretAccessKey
        ? new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  isConfigured(): boolean {
    return !!(this.client && this.bucket && this.cloudfrontUrl);
  }

  async uploadImage(file: Express.Multer.File): Promise<StoredUploadResult> {
    if (!this.client || !this.bucket || !this.cloudfrontUrl) {
      throw new BadRequestException(
        'CloudFront/S3 upload is not configured. Set AWS_S3_BUCKET, AWS_CLOUDFRONT_URL, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.',
      );
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException('No file provided');
    }

    const ext = this.extensionFromMime(file.mimetype) || this.extensionFromName(file.originalname) || 'jpg';
    const key = `${this.prefix}/${Date.now()}-${randomUUID()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      url: `${this.cloudfrontUrl}/${key}`,
      key,
      format: ext,
      bytes: file.size,
    };
  }

  private extensionFromMime(mime: string): string | null {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/avif': 'avif',
    };
    return map[mime] || null;
  }

  private extensionFromName(name: string): string | null {
    const match = name?.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  }
}
