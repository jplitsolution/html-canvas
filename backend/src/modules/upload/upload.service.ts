import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  async uploadImage(
    file: Express.Multer.File,
    folder = 'templatecraft',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

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
            return reject(
              new BadRequestException(
                `Cloudinary upload failed: ${error.message}`,
              ),
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

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
