import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import getConfig from './config/configuration.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { uploadRoutes } from './modules/upload/upload.routes.js';
import { templatesRoutes } from './modules/templates/templates.routes.js';
import { partnersRoutes } from './modules/partners/partners.routes.js';
import { marketsRoutes } from './modules/markets/markets.routes.js';
import { campaignsRoutes } from './modules/campaigns/campaigns.routes.js';
import { flowRoutes } from './modules/flow/flow.routes.js';
import { otpRoutes } from './modules/otp/otp.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { logsRoutes } from './modules/logs/logs.routes.js';

export const createApp = async () => {
  const config = getConfig();
  const app = Fastify({
    logger: {
      level: 'info',
    },
  });

  const localUploadDir =
    config.uploads?.localDir || join(process.cwd(), 'uploads');
  if (!existsSync(localUploadDir)) {
    mkdirSync(localUploadDir, { recursive: true });
  }

  // Register CORS
  const corsOrigins = config.corsOrigins || [];
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || origin.startsWith('http://localhost:')) {
        return cb(null, true);
      }
      if (corsOrigins.some((allowed) => origin === allowed)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Register JWT
  await app.register(jwt, {
    secret: config.jwt?.secret || 'fallback_secret_key',
    sign: {
      expiresIn: config.jwt?.expiresIn || '24h',
    },
  });

  // Authentication Decorator Guard
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (request.user && request.user.sub != null && request.user.id == null) {
        request.user.id = Number(request.user.sub);
      }
    } catch (_err) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });

  // Register Multipart File Upload
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // Register Static Media Directory
  await app.register(fastifyStatic, {
    root: localUploadDir,
    prefix: '/api/media/',
  });

  // Register Swagger Documentation
  if (config.environment !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'TemplateCraft API (Fastify)',
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
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/api/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  // Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message,
    });
  });

  // Health Check Endpoint
  app.get('/api', async (_request, _reply) => {
    return { status: 'ok', service: 'TemplateCraft API' };
  });
  app.get('/api/', async (_request, _reply) => {
    return { status: 'ok', service: 'TemplateCraft API' };
  });

  // Register Module Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(uploadRoutes, { prefix: '/api/uploads' });
  await app.register(templatesRoutes, { prefix: '/api/templates' });
  await app.register(partnersRoutes, { prefix: '/api/partners' });
  await app.register(marketsRoutes, { prefix: '/api/markets' });
  await app.register(campaignsRoutes, { prefix: '/api/campaigns' });
  await app.register(flowRoutes, { prefix: '/api/flow' });
  await app.register(otpRoutes, { prefix: '/api/otp' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(logsRoutes, { prefix: '/api/logs' });

  return app;
};
