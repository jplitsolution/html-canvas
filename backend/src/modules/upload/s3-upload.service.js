import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import getConfig from '../../config/configuration.js';

export const createS3UploadService = () => {
  const config = getConfig();
  const region = config.aws?.region || 'ap-south-1';
  const accessKeyId = config.aws?.accessKeyId;
  const secretAccessKey = config.aws?.secretAccessKey;

  const bucket = config.aws?.s3Bucket || '';
  const cloudfrontUrl = (config.aws?.cloudfrontUrl || '').replace(/\/$/, '');
  const prefix = (config.aws?.s3Prefix || 'templatecraft').replace(/^\/+|\/+$/g, '');

  const client =
    bucket && accessKeyId && secretAccessKey
      ? new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
        })
      : null;

  const isConfigured = () => !!(client && bucket && cloudfrontUrl);

  const extensionFromMime = (mime) => {
    const map = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/avif': 'avif',
    };
    return map[mime] || null;
  };

  const extensionFromName = (name) => {
    const match = name?.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  };

  const uploadImage = async (file) => {
    if (!client || !bucket || !cloudfrontUrl) {
      const err = new Error(
        'CloudFront/S3 upload is not configured. Set AWS_S3_BUCKET, AWS_CLOUDFRONT_URL, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.',
      );
      err.statusCode = 400;
      throw err;
    }

    if (!file?.buffer?.length) {
      const err = new Error('No file provided');
      err.statusCode = 400;
      throw err;
    }

    const ext =
      extensionFromMime(file.mimetype) ||
      extensionFromName(file.filename || file.originalname) ||
      'jpg';
    const key = `${prefix}/${Date.now()}-${randomUUID()}.${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      url: `${cloudfrontUrl}/${key}`,
      key,
      format: ext,
      bytes: file.buffer.length || file.size || 0,
    };
  };

  return {
    isConfigured,
    uploadImage,
  };
};

export const s3UploadService = createS3UploadService();
