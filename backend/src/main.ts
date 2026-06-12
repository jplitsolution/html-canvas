import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const environment = configService.get<string>('environment') || 'development';

  // Global Prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:5173/',
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
