import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import swaggerUi from 'swagger-ui-express';
import getConfig from './config/configuration.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './common/middleware/error.middleware.js';

export const createApp = async () => {
  const config = getConfig();
  const app = express();

  const localUploadDir =
    config.uploads?.localDir || join(process.cwd(), 'uploads');
  if (!existsSync(localUploadDir)) {
    mkdirSync(localUploadDir, { recursive: true });
  }

  app.set('trust proxy', 1);

  const corsOrigins = config.corsOrigins || [];
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || origin.startsWith('http://localhost:')) {
          return cb(null, true);
        }
        if (corsOrigins.some((allowed) => origin === allowed)) {
          return cb(null, true);
        }
        return cb(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
    }),
  );

  app.use(morgan(config.environment === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/media', express.static(localUploadDir));

  if (config.environment !== 'production') {
    const openapi = {
      openapi: '3.0.0',
      info: {
        title: 'TemplateCraft API (Express)',
        description: 'API documentation for TemplateCraft backend',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      paths: {},
    };
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
  }

  app.get(['/api', '/api/'], (_req, res) => {
    res.json({ status: 'ok', service: 'TemplateCraft API' });
  });

  registerRoutes(app);

  app.use(errorHandler);

  return app;
};
