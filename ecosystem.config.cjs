/**
 * PM2 process definitions for AlmaLinux production.
 * Each app runs start.sh which builds first — if build fails, PM2 won't start.
 * Ports: set DEPLOY_* in deploy.env.
 */
module.exports = {
  apps: [
    {
      name: 'templatecraft-api',
      cwd: './backend',
      script: 'start.sh',
      interpreter: '/bin/bash',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'templatecraft-web',
      cwd: './frontend',
      script: 'start.sh',
      interpreter: '/bin/bash',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        FRONTEND_PORT: process.env.FRONTEND_PORT || '8080',
      },
    },
  ],
};
