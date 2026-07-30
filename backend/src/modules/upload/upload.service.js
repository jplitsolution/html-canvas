import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import getConfig from '../../config/configuration.js';
import { s3UploadService } from './s3-upload.service.js';
import { localUploadService } from './local-upload.service.js';

export const createUploadService = () => {
  const config = getConfig();

  const isCloudinaryConfigured = () => {
    const cloudName = config.cloudinary?.cloudName;
    const apiKey = config.cloudinary?.apiKey;
    const apiSecret = config.cloudinary?.apiSecret;
    return !!(cloudName && apiKey && apiSecret);
  };

  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
  }

  const allowLocalFallback = () => {
    return config.environment !== 'production';
  };

  const uploadToCloudinary = (file, folder) => {
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
            const err = new Error(`Cloudinary upload failed: ${detail}`);
            err.statusCode = 400;
            return reject(err);
          }
          if (!result) {
            const err = new Error('Cloudinary upload returned empty result');
            err.statusCode = 400;
            return reject(err);
          }
          resolve(result);
        },
      );

      uploadStream.on('error', (streamError) => {
        const err = new Error(
          `Cloudinary upload failed: ${streamError.message || 'network error'}`,
        );
        err.statusCode = 400;
        reject(err);
      });

      Readable.from(file.buffer).pipe(uploadStream);
    });
  };

  const uploadImage = async (file, folder = 'templatecraft') => {
    if (!file) {
      const err = new Error('No file provided');
      err.statusCode = 400;
      throw err;
    }

    if (s3UploadService.isConfigured()) {
      return s3UploadService.uploadImage(file);
    }

    if (isCloudinaryConfigured()) {
      try {
        const result = await uploadToCloudinary(file, folder);
        return {
          url: result.secure_url,
          key: result.public_id,
          format: result.format,
          bytes: result.bytes,
        };
      } catch (error) {
        if (!allowLocalFallback()) {
          throw error;
        }
        return localUploadService.uploadImage(file);
      }
    }

    if (allowLocalFallback()) {
      return localUploadService.uploadImage(file);
    }

    const err = new Error(
      'Image upload is not configured. Set AWS S3/CloudFront credentials, Cloudinary credentials, or run in development mode for local uploads.',
    );
    err.statusCode = 400;
    throw err;
  };

  return {
    uploadImage,
    isCloudinaryConfigured,
    allowLocalFallback,
  };
};

export const uploadService = createUploadService();
