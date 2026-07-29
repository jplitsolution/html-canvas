import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class LocalUploadService {
  constructor(@Inject(ConfigService) configService) {
    this.configService = configService;
    this.uploadDir =
      this.configService.get('uploads.localDir') ||
      join(process.cwd(), 'uploads');
    this.publicPath =
      this.configService.get('uploads.publicPath') || '/api/media';
    this.prefix = (
      this.configService.get('uploads.prefix') || 'templatecraft'
    ).replace(/^\/+|\/+$/g, '');
  }

  async uploadImage(file) {
    if (!file?.buffer?.length) {
      throw new Error('No file provided');
    }

    const ext =
      this.extensionFromMime(file.mimetype) ||
      this.extensionFromName(file.originalname) ||
      'jpg';
    const key = `${this.prefix}/${Date.now()}-${randomUUID()}.${ext}`;
    const absolutePath = join(this.uploadDir, key);

    await mkdir(join(this.uploadDir, this.prefix), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      url: `${this.publicPath}/${key}`,
      key,
      format: ext,
      bytes: file.size,
    };
  }

  getUploadDir() {
    return this.uploadDir;
  }

  extensionFromMime(mime) {
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
  }

  extensionFromName(name) {
    const match = name?.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  }
}
