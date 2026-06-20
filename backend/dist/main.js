"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const path_1 = require("path");
const fs_1 = require("fs");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port') || 3000;
    const environment = configService.get('environment') || 'development';
    const localUploadDir = configService.get('uploads.localDir') ||
        (0, path_1.join)(process.cwd(), 'uploads');
    if (!(0, fs_1.existsSync)(localUploadDir)) {
        (0, fs_1.mkdirSync)(localUploadDir, { recursive: true });
    }
    app.setGlobalPrefix('api');
    app.useStaticAssets(localUploadDir, {
        prefix: '/api/media/',
    });
    app.enableCors({
        origin: 'http://localhost:5173',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
    if (environment !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('TemplateCraft API')
            .setDescription('The API documentation for TemplateCraft backend (Canvas & Editor)')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
        logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
    }
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}/api`);
}
void bootstrap();
//# sourceMappingURL=main.js.map