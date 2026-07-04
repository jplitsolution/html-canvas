# Production Deployment Architecture

This document describes the compilation, server provisioning, reverse proxy, and storage infrastructure required to deploy TemplateCraft in production.

---

## 1. Production Build Commands

Deploying TemplateCraft requires compiling both the backend services and the frontend single-page application.

### 1.1 Backend Service Compilation
1. In `backend/`, install production dependencies only:
   ```bash
   npm ci --only=production
   ```
2. Compile the TypeScript files:
   ```bash
   npm run build
   ```
   *This outputs javascript files into the `backend/dist/` folder.*
3. Execute the service runtime:
   ```bash
   node dist/main.js
   ```

### 1.2 Frontend Assets Compilation
1. In `frontend/`, install dependencies:
   ```bash
   npm ci
   ```
2. Build the optimized static bundle:
   ```bash
   npm run build
   ```
   *This outputs compiled javascript, CSS, and asset files into the `frontend/dist/` folder.*

---

## 2. Infrastructure Architecture

In a production environment, the platform should be deployed behind an Nginx reverse proxy or static CDN:

```
                          [ Client Browser ]
                                  │
                                  ▼
                            [ Load Balancer ]
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
        [ Frontend Static CDN ]       [ Nginx Reverse Proxy ]
        - Serves frontend/dist/       - Proxies /api to Node Cluster
        - (CloudFront / S3 / Netlify) - SSL Termination
                                                 │
                                                 ▼
                                        [ NestJS Node Cluster ]
                                        - Running via PM2 / Docker
                                        - Port 3000
```

### 2.1 Nginx Reverse Proxy Configuration
Nginx handles SSL termination and directs traffic to the frontend bundle and backend API cluster:
- **Root Location (`/`)**: Serves compiled static assets from the `frontend/dist/` directory.
- **API Location Proxy (`/api`)**: Re-routes requests directly to the NestJS cluster:
  ```nginx
  location /api/ {
      proxy_pass http://localhost:3000/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
  }
  ```

---

## 3. Database Sync & Migrations Guard

> [!IMPORTANT]
> **Production Schema Security**:
> - Never run backend nodes with `synchronize: true` in production configuration.
> - Ensure `migrationsRun: true` remains configured in `app.module.ts` to automatically execute migration scripts on container startups.
> - Set up automated database backup rules for relational databases (MySQL/PostgreSQL).

---

## 4. Production Cloud Media Configuration

To disable local media uploads and host images via a global CDN:
1. Set the environment flag: `NODE_ENV=production`.
2. Configure AWS S3 credential variables:
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_BUCKET` (e.g. `templatecraft-media`)
   - `AWS_CLOUDFRONT_URL` (points to the CDN distribution mapping the S3 bucket)
3. Under this layout, media files uploaded in GrapesJS are pushed to S3 and served via CloudFront URLs, avoiding disk space issues on backend nodes.
