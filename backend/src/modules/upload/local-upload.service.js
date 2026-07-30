import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import getConfig from '../../config/configuration.js';

export const createLocalUploadService = () => {
  const config = getConfig();
  const uploadDir = config.uploads?.localDir || join(process.cwd(), 'uploads');
  const publicPath = config.uploads?.publicPath || '/api/media';
  const prefix = (config.uploads?.prefix || 'templatecraft').replace(/^\/+|\/+$/g, '');

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
    if (!file?.buffer?.length) {
      throw new Error('No file provided');
    }

    const ext =
      extensionFromMime(file.mimetype) ||
      extensionFromName(file.filename || file.originalname) ||
      'jpg';
    const key = `${prefix}/${Date.now()}-${randomUUID()}.${ext}`;
    const absolutePath = join(uploadDir, key);

    await mkdir(join(uploadDir, prefix), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      url: `${publicPath}/${key}`,
      key,
      format: ext,
      bytes: file.buffer.length || file.size || 0,
    };
  };

  return {
    uploadImage,
    getUploadDir: () => uploadDir,
  };
};

export const localUploadService = createLocalUploadService();
