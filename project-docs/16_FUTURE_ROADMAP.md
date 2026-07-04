# Feature Implementation Roadmap

This document outlines key technical improvements, architecture enhancements, and upcoming features planned for the TemplateCraft platform.

---

## 1. Core Feature Enhancements

### 1.1 Complete OTP Funnel Integration
- **Context**: Currently, the OTP endpoints (`/otp/send` and `/otp/verify`) exist in the `OtpModule` but are not integrated into the main `FlowService.transition()` state machine.
- **Milestone**:
  - Add OTP action handler transitions (`OTP_SEND`, `OTP_VERIFY`) inside the `FlowService`.
  - On successful verification of OTP, transition the funnel status directly from `OTP` to the `CONFIRM` page.
  - Implement the corresponding SMS API calls inside `OtpService` to replace the development mock log output.

### 1.2 Multi-Template A/B Testing
- **Context**: Currently, page types are limited to one template per campaign.
- **Milestone**:
  - Extend the `campaign_pages` database schema to support multiple template IDs.
  - Update `FlowService.getPage()` to distribute traffic (e.g. 50/50 splits) between different template variants.
  - Upgrade campaign analytics to track conversion performance metrics split by template ID.

### 1.3 Live WebSocket Conversion Feeds
- **Context**: Dashboard analytics are currently loaded via polling or manual page refreshes.
- **Milestone**:
  - Implement a gateway using NestJS WebSockets (`@nestjs/websockets`).
  - Broadcast visit conversions (`VisitStatus.SUCCESS`) to dashboard clients in real-time.

---

## 2. Infrastructure & Performance Scaling

```
                         [ Redis Cache ]
                               ▲
                               │ (Sub-10ms Config Read)
                               ▼
[ Incoming Request ] ──► [ Flow Router ]
                               │
                               ▼ (Enqueue Telemetry Event)
                        [ Message Queue ] ──► [ Consumer ] ──► [ DB Write ]
```

### 2.1 Telemetry Offloading (Message Queue)
- **Problem**: Under high traffic (e.g. 100+ clicks/second), executing database writes on every page visit and event will exhaust TypeORM's pool connections and increase database latency.
- **Milestone**:
  - Set up a message broker (RabbitMQ or BullMQ).
  - Modify `AnalyticsService` to push visit and event records to the queue.
  - Implement a background consumer script to process writes in batches, minimizing write load on the primary relational database.

### 2.2 Redis Cache Integration
- **Problem**: Resolving campaigns and integrations APIs on every page visit requires database calls.
- **Milestone**:
  - Introduce Redis caching.
  - Cache campaigns and API configurations keyed by operator/country.
  - Cache verification check results for blocklists and subscription active checks.

### 2.3 CDN Edge Pre-rendering
- **Problem**: Page load time directly impacts conversion rates, especially on mobile devices.
- **Milestone**:
  - Deploy edge pre-rendering functions (e.g. Cloudflare Workers).
  - Fetch visual HTML/CSS pages from a CDN cache, interpolate variables at the edge, and serve the final page to the subscriber.
