import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const environment = configService.get<string>('environment') || 'development';
  const localUploadDir =
    configService.get<string>('uploads.localDir') ||
    join(process.cwd(), 'uploads');

  if (!existsSync(localUploadDir)) {
    mkdirSync(localUploadDir, { recursive: true });
  }

  // Global Prefix
  app.setGlobalPrefix('api');

  // Dev/local upload files (S3/CloudFront or Cloudinary used in production when configured)
  app.useStaticAssets(localUploadDir, {
    prefix: '/api/media/',
  });

  const corsOrigins = configService.get<string[]>('corsOrigins') || [];

  // Enable CORS (localhost in dev; set CORS_ORIGIN for production)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origin.startsWith('http://localhost:')) {
        callback(null, true);
        return;
      }
      if (corsOrigins.some((allowed) => origin === allowed)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip non-decorated properties
      transform: true, // auto-transform payloads to DTO instances
      forbidNonWhitelisted: false,
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  if (environment !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TemplateCraft API')
      .setDescription(
        'The API documentation for TemplateCraft backend (Canvas & Editor)',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(
      `Swagger documentation available at http://localhost:${port}/api/docs`,
    );
  }

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
}
void bootstrap();
