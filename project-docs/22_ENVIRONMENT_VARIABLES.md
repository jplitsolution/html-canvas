# Environment Variables Catalog

This document details the configuration parameters available for the backend and frontend runtimes.

---

## 1. Backend Configurations (`backend/.env`)

These environment variables configure server ports, database adapters, JWT settings, and cloud media providers.

| Variable Name | Required | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| **`PORT`** | No | `3000` | Port on which the NestJS Express server runs. |
| **`NODE_ENV`** | No | `development` | Application environment context (`development` / `production`). |
| **`DB_TYPE`** | No | `mysql` | Relational database adapter. Options: `mysql`, `postgres`. |
| **`DB_HOST`** | Yes | `localhost` | Relational database host address. |
| **`DB_PORT`** | No | `3306` (or `5432`) | Connection port of the target database engine. |
| **`DB_USERNAME`** | Yes | `root` | Database username. |
| **`DB_PASSWORD`** | Yes | — | Database connection password. |
| **`DB_DATABASE`** | No | `templatecraft` | Name of the primary database schema. |
| **`JWT_SECRET`** | Yes | `fallback_secret` | Secret key used for JWT signing. |
| **`JWT_EXPIRATION`** | No | `24h` | JWT validation duration (e.g. `24h`, `7d`). |
| **`CLOUDINARY_CLOUD_NAME`**| No | — | Cloudinary cloud account name identifier. |
| **`CLOUDINARY_API_KEY`** | No | — | Cloudinary API access key. |
| **`CLOUDINARY_API_SECRET`** | No | — | Cloudinary API secret. |
| **`AWS_REGION`** | No | `ap-south-1` | Amazon AWS datacenter location (e.g., `us-east-1`). |
| **`AWS_ACCESS_KEY_ID`** | No | — | AWS IAM user access ID. |
| **`AWS_SECRET_ACCESS_KEY`**| No | — | AWS IAM user secret key. |
| **`AWS_S3_BUCKET`** | No | — | AWS S3 bucket name. |
| **`AWS_CLOUDFRONT_URL`** | No | — | CloudFront CDN distribution base URL mapping the S3 bucket. |
| **`AWS_S3_PREFIX`** | No | `templatecraft` | Directory folder prefix for items uploaded to S3. |
| **`UPLOAD_LOCAL_DIR`** | No | — | Target path to store files locally when in dev mode. |
| **`UPLOAD_PUBLIC_PATH`** | No | `/api/media` | Endpoint prefix through which local assets are served. |
| **`UPLOAD_PREFIX`** | No | `templatecraft` | Directory folder prefix for local uploads. |
| **`OTP_EXPOSE_TEST`** | No | `false` | Explicitly enables returning OTP codes in testing responses when `NODE_ENV` is set to `test` or `testing`. |

---

## 2. Frontend Configurations (`frontend/.env`)

Vite parses client environment variables prefixed with `VITE_`.

| Variable Name | Required | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| **`VITE_API_BASE_URL`** | No | `/api` | Base URL of the backend REST service. Points to standard paths (like `http://localhost:3000`) in local development. |
