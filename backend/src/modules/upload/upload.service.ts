import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';
import { S3UploadService, StoredUploadResult } from './s3-upload.service';
import { LocalUploadService } from './local-upload.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly configService: ConfigService,
    private readonly s3UploadService: S3UploadService,
    private readonly localUploadService: LocalUploadService,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    folder = 'templatecraft',
  ): Promise<StoredUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (this.s3UploadService.isConfigured()) {
      return this.s3UploadService.uploadImage(file);
    }

    if (this.isCloudinaryConfigured()) {
      try {
        const result = await this.uploadToCloudinary(file, folder);
        return {
          url: result.secure_url,
          key: result.public_id,
          format: result.format,
          bytes: result.bytes,
        };
      } catch (error) {
        if (!this.allowLocalFallback()) {
          throw error;
        }
        return this.localUploadService.uploadImage(file);
      }
    }

    if (this.allowLocalFallback()) {
      return this.localUploadService.uploadImage(file);
    }

    throw new BadRequestException(
      'Image upload is not configured. Set AWS S3/CloudFront credentials, Cloudinary credentials, or run in development mode for local uploads.',
    );
  }

  private isCloudinaryConfigured(): boolean {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');
    return !!(cloudName && apiKey && apiSecret);
  }

  private allowLocalFallback(): boolean {
    return this.configService.get<string>('environment') !== 'production';
  }

  private uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            const detail =
              error.message ||
              (typeof error === 'object'
                ? JSON.stringify(error)
                : String(error));
            return reject(
              new BadRequestException(`Cloudinary upload failed: ${detail}`),
            );
          }
          if (!result) {
            return reject(
              new BadRequestException(
                'Cloudinary upload returned empty result',
              ),
            );
          }
          resolve(result);
        },
      );

      uploadStream.on('error', (streamError: Error) => {
        reject(
          new BadRequestException(
            `Cloudinary upload failed: ${streamError.message || 'network error'}`,
          ),
        );
      });

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
