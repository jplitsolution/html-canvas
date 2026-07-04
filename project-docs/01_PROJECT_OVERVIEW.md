# Project Overview: TemplateCraft (Dynamic Subscription Flow Builder)

## 1. What is TemplateCraft?

**TemplateCraft** is a **Dynamic Subscription Flow Builder** designed to build, manage, customize, and route mobile subscription landing pages. It acts as a middle-tier bridging mobile advertising campaigns, page templates (rendered and configured in a visual canvas editor), and third-party partner subscription billing APIs.

In high-volume mobile entertainment and premium SMS/billing markets, marketers must design highly optimized landing pages tailored to specific countries, mobile network operators, and subscription packages. TemplateCraft makes this dynamic, allowing administrators to customize distinct step-by-step user funnels, test configurations, and collect live performance statistics.

---

## 2. Core Functional Requirements

- **Multi-Tenant/Operator Campaigns**: Define unique campaigns mapped to specific `(country, operator)` pairs.
- **Visual Design Canvas**: Design six template pages per campaign:
  - **HOME**: The primary landing/sales page.
  - **CONFIRM**: The subscription verification / pack picker page (daily/weekly/monthly).
  - **OTP**: A user authentication gate if mobile headers are missing.
  - **THANKYOU**: The success page shown upon active billing confirmation.
  - **BLOCKED**: Shown if a user is blocklisted or fails qualification criteria.
  - **ERROR**: An error fallback page.
- **Automated MSISDN Detection**: Read mobile network-injected headers (e.g. `X-MSISDN`) to identify the subscriber. If headers are absent, transition the user to a manual OTP input form.
- **Dynamic Routing Flow**: Redirect users dynamically depending on:
  - Direct operator checks (is the customer already subscribed?).
  - DND/Blocklist databases (is the number barred from receiving billing requests?).
- **Analytics & Funnel Tracking**: Log high-frequency impressions, clicks, actions, conversions, block rates, and error occurrences, alongside a dedicated **Real-Time OTP Analytics Dashboard** tracking SMS delivery performance and brute-force indicators.

---

## 3. Core Target Users

1. **Campaign Administrators & Marketers**: 
   - Manage campaign lists.
   - Design funnel layouts using standard blocks.
   - Configure external partner API integrations (Blocklist, Subscription Validation, and Charging endpoints).
   - Track traffic volumes, conversion rates, and subscription drop-offs.
2. **Mobile Consumers (End-Users)**:
   - Access campaign links (e.g., from search/social media ads).
   - Experience high-performance, responsive visual pages.
   - Enter their phone number / OTP code or complete 1-click subscription purchases directly on their carrier bill.
