/**
 * PM2 process definitions for AlmaLinux production.
 * Started by ./deploy.sh — do not edit ports here; set DEPLOY_* in deploy.env.
 */
module.exports = {
  apps: [
    {
      name: 'templatecraft-api',
      cwd: './backend',
      script: './start.sh',
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
      script: './start.sh',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
