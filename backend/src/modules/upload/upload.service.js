import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { S3UploadService } from './s3-upload.service';
import { LocalUploadService } from './local-upload.service';

@Injectable()
export class UploadService {
  constructor(
    @Inject(ConfigService) configService,
    @Inject(S3UploadService) s3UploadService,
    @Inject(LocalUploadService) localUploadService,
  ) {
    this.configService = configService;
    this.s3UploadService = s3UploadService;
    this.localUploadService = localUploadService;
  }

  async uploadImage(file, folder = 'templatecraft') {
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

  isCloudinaryConfigured() {
    const cloudName = this.configService.get('cloudinary.cloudName');
    const apiKey = this.configService.get('cloudinary.apiKey');
    const apiSecret = this.configService.get('cloudinary.apiSecret');
    return !!(cloudName && apiKey && apiSecret);
  }

  allowLocalFallback() {
    return this.configService.get('environment') !== 'production';
  }

  uploadToCloudinary(file, folder) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
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

      uploadStream.on('error', (streamError) => {
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
