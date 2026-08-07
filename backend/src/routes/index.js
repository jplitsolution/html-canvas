/**
 * Central route registration — Express routers + controllers.
 *
 * Pattern per module:
 *   *.routes.js      → thin Express Router (paths + middleware)
 *   *.controller.js  → HTTP handlers (req/res)
 *   *.service.js     → business logic
 *
 * See docs/ROUTES.md
 */
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import uploadRoutes from '../modules/upload/upload.routes.js';
import templatesRoutes from '../modules/templates/templates.routes.js';
import partnersRoutes from '../modules/partners/partners.routes.js';
import marketsRoutes from '../modules/markets/markets.routes.js';
import campaignsRoutes from '../modules/campaigns/campaigns.routes.js';
import flowRoutes from '../modules/flow/flow.routes.js';
import otpRoutes from '../modules/otp/otp.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import logsRoutes from '../modules/logs/logs.routes.js';

export function registerRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/partners', partnersRoutes);
  app.use('/api/markets', marketsRoutes);
  app.use('/api/campaigns', campaignsRoutes);
  app.use('/api/flow', flowRoutes);
  app.use('/api/otp', otpRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/logs', logsRoutes);
}
