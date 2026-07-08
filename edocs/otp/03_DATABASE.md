# OTP Database Schema & Configuration Storage

To support campaign-level dynamic gateway configurations and secure telemetry tracking, the relational database tables were extended.

## Table Structures

### 1. `otp_requests` Table
Tracks user verification request lifecycles.
- **`id`**: integer, Primary Key, Auto-increment.
- **`phone`**: varchar(32) — Destination MSISDN.
- **`otp_hash`**: varchar(255) — SHA-256 salted hash.
- **`otp_salt`**: varchar(64), Nullable — Hashing cryptographic salt.
- **`visit_id`**: integer, Nullable — Session index from `visits`.
- **`campaign_id`**: integer, Nullable — Campaign ID.
- **`provider`**: varchar(32), Nullable — e.g. 'twilio', 'msg91'.
- **`provider_request_id`**: varchar(255), Nullable — Remote reference ID.
- **`status`**: varchar(32) — 'sent', 'verified', 'failed'.
- **`attempts`**: integer — Count of failed verify clicks (max 5).
- **`verified_at`**: datetime, Nullable — Verification completion time.
- **`expires_at`**: datetime — OTP request expiration deadline (5m).
- **`created_at`**: datetime — Generation timestamp.
- **`updated_at`**: datetime — Row update timestamp.

### 2. `api_configs` Table
Extended to avoid duplicate tables, storing campaign OTP gateway setups.
- **`otp_provider`**: varchar(32) — 'local', 'twilio', 'msg91', 'kaleyra', 'partner', 'custom'.
- **`otp_config_json`**: text — JSON-serialized string containing provider credentials and templates.
