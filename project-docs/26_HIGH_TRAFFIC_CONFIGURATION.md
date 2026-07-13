# High Traffic Rate Limiting & Proxy Configuration

This guide provides step-by-step instructions to configure **Nginx Rate Limiting**, **Nginx Micro-caching**, and **Cloudflare WAF Rate Limiting Rules** in production to minimize backend load and protect API endpoints from brute-force/abuse.

---

## 1. Nginx Setup (Web Server Level)

We have created a production-ready config file in your project root: [nginx.conf](file:///d:/dddd/nginx.conf).

### Deployment Instructions:
1. Copy the file to your server's Nginx configuration directory:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/templatecraft
   ```
2. Open `/etc/nginx/sites-available/templatecraft` and adjust the following parameters:
   - `server_name`: Change from `localhost` to your actual domain name (e.g. `campaigns.yourdomain.com`).
   - `root`: Verify that it points to the absolute path of your built frontend files (e.g. `/var/www/templatecraft/frontend/dist`).
3. Enable the config by linking it to `sites-enabled`:
   ```bash
   sudo ln -s /etc/nginx/sites-available/templatecraft /etc/nginx/sites-enabled/
   ```
4. Test the Nginx syntax configuration:
   ```bash
   sudo nginx -t
   ```
5. Reload Nginx to apply changes:
   ```bash
   sudo systemctl restart nginx
   ```

*Note: Since Nginx is now serving the static frontend files directly from the disk `/frontend/dist`, you can stop the PM2 `templatecraft-web` instance to free up memory on your server.*

---

## 2. Cloudflare Setup (Edge CDN Level)

To protect your backend before traffic ever reaches your server, configure the following **Rate Limiting Rules** in the **Cloudflare Dashboard (Security -> WAF -> Rate Limiting Rules)**:

### Rule 1: Protect OTP Send endpoint
* **Name**: Protect OTP Send endpoint
* **If incoming requests match**:
  - `Field`: URI Path
  - `Operator`: equals
  - `Value`: `/api/otp/send`
* **Then... (Action)**:
  - `Choose Action`: **Block** or **Interactive Challenge** (Managed Challenge)
  - `With Rate`:
    - `Rate Limit`: **5 requests**
    - `Period`: **1 Minute** (Per IP address)

### Rule 2: Protect Flow transitions
* **Name**: Protect subscription transitions
* **If incoming requests match**:
  - `Field`: URI Path
  - `Operator`: equals
  - `Value`: `/api/flow/transition`
* **Then... (Action)**:
  - `Choose Action`: **Block**
  - `With Rate`:
    - `Rate Limit`: **10 requests**
    - `Period`: **1 Minute** (Per IP address)

---

## 3. Rate Limiting Metrics Audit

When rate limiting limits are exceeded:
- **Nginx/Cloudflare** responds with an HTTP status `429 Too Many Requests`.
- legitimate traffic flow is protected, and backend load is kept at a minimum.
- NestJS internal throttler guard ([public-rate-limit.guard.ts](file:///d:/dddd/backend/src/common/guards/public-rate-limit.guard.ts)) will catch any bypasses, log them into the SQL Database under `RATE_LIMIT_HIT` for admin auditing, and return a clean error payload.
