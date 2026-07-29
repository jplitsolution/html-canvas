import 'reflect-metadata';
import { initDatabase } from './database/index.js';
import { seedPrebuiltTemplates } from './database/seed/templates-seed.service.js';
import { createApp } from './app.js';
import getConfig from './config/configuration.js';

const start = async () => {
  try {
    const config = getConfig();
    const port = config.port || 3000;

    console.log('Initializing database connection...');
    await initDatabase();
    console.log('Database initialized successfully.');

    console.log('Seeding prebuilt templates...');
    await seedPrebuiltTemplates();

    const app = await createApp();

    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify Server running on http://localhost:${port}/api`);
    if (config.environment !== 'production') {
      console.log(
        `📚 Swagger Docs available at http://localhost:${port}/api/docs`,
      );
    }
  } catch (err) {
    console.error('Fatal error during server startup:', err);
    process.exit(1);
  }
};

start();
