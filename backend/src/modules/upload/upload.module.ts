import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryProvider } from './cloudinary.provider';
import { LocalUploadService } from './local-upload.service';
import { S3UploadService } from './s3-upload.service';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    CloudinaryProvider,
    LocalUploadService,
    S3UploadService,
    UploadService,
  ],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}
