import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { StoredUploadResult } from './s3-upload.service';

@Injectable()
export class LocalUploadService {
  private readonly uploadDir: string;
  private readonly publicPath: string;
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir =
      this.configService.get<string>('uploads.localDir') ||
      join(process.cwd(), 'uploads');
    this.publicPath =
      this.configService.get<string>('uploads.publicPath') || '/api/media';
    this.prefix = (
      this.configService.get<string>('uploads.prefix') || 'templatecraft'
    ).replace(/^\/+|\/+$/g, '');
  }

  async uploadImage(file: Express.Multer.File): Promise<StoredUploadResult> {
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

  getUploadDir(): string {
    return this.uploadDir;
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
