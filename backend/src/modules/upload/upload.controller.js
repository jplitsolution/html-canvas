import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadController {
  constructor(@Inject(UploadService) uploadService) {
    this.uploadService = uploadService;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an image to CloudFront (S3) or Cloudinary fallback',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request / Invalid file' })
  async uploadFile(@UploadedFile() file) {
    if (!file) {
      throw new BadRequestException(
        'Please provide a file in the form field "file"',
      );
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const uploadResult = await this.authServiceUpload(file);
    return {
      url: uploadResult.url,
      publicId: uploadResult.key,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    };
  }

  async authServiceUpload(file) {
    return this.uploadService.uploadImage(file);
  }
}
