# API route map

Express routers are registered in [`backend/src/routes/index.js`](../backend/src/routes/index.js).

**Per module layout:**
- `*.routes.js` — paths + middleware only (top of folder)
- `*.controller.js` — HTTP handlers (`req` / `res`)
- `*.service.js` — main business facades
- `helpers/` — split helpers / internal pieces (keep main files uncluttered)

| Method | Path | Routes | Controller |
|--------|------|--------|------------|
| GET | `/api` | `app.js` | health |
| * | `/api/auth/*` | `modules/auth/auth.routes.js` | `auth.controller.js` |
| * | `/api/users/*` | `modules/users/users.routes.js` | `users.controller.js` |
| POST | `/api/uploads` | `modules/upload/upload.routes.js` | `upload.controller.js` |
| * | `/api/templates/*` | `modules/templates/templates.routes.js` | `templates.controller.js` |
| * | `/api/partners/*` | `modules/partners/partners.routes.js` | `partners.controller.js` |
| * | `/api/markets/*` | `modules/markets/markets.routes.js` | `markets.controller.js` |
| * | `/api/campaigns/*` | `modules/campaigns/campaigns.routes.js` | `campaigns.controller.js` |
| GET | `/api/flow/detect-msisdn` | `modules/flow/flow.routes.js` | `flow.controller.js` |
| GET | `/api/flow/entry` | same | same |
| GET | `/api/flow/page` | same | same |
| POST | `/api/flow/transition` | same | same |
| POST | `/api/flow/priority-check` | same | `flow-priority.controller.js` |
| GET/POST | `/api/flow/callback` | same | `flow.controller.js` → postback |
| POST | `/api/flow/register-postback` | same | same |
| POST | `/api/otp/*` | `modules/otp/otp.routes.js` | `otp.controller.js` |
| * | `/api/analytics/*` | `modules/analytics/analytics.routes.js` | `analytics.controller.js` |
| * | `/api/logs/*` | `modules/logs/logs.routes.js` | `logs.controller.js` |

Dev docs UI: `/api/docs`.

When adding a route: wire in `*.routes.js` → handler in `*.controller.js` → logic in `*.service.js`, then update this table.
