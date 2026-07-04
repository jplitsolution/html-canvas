# OTP Analytics Dashboard

TemplateCraft features a real-time OTP Analytics Dashboard. This document outlines the metrics, endpoints, visualizations, and tracking architecture.

---

## 1. OTP Lifecycle Events

The system tracks every OTP transition event:
- **Requested**: Created on `/otp/send` hit (stored as `pending`).
- **Sent**: Dispatched successfully by SMS gateway.
- **Failed**: Dispatch failed due to incorrect gateway credentials, carrier bounce, etc.
- **Verified**: Client provided correct 6-digit verification code.
- **Expired**: Code exceeded its TTL (defaults to 5 minutes) without matching.
- **Resent**: Total attempts to request a code for a single phone/visit session.
- **Blocked**: Prevented due to active IP throttling or temporary lockouts.

---

## 2. API Reference

### Get OTP Analytics
`GET /api/analytics/otp`
- **Authentication**: Required (Bearer Token via `JwtAuthGuard`).
- **Parameters**: 
  - `campaignId` (optional, number): Filter stats for a specific country/operator pair.
- **Response Structure**:
  ```json
  {
    "summary": {
      "totalRequests": 120,
      "sentRequests": 115,
      "verifiedRequests": 85,
      "failedRequests": 5,
      "verificationRate": 70.83,
      "failureRate": 4.17,
      "successRate": 73.91,
      "avgVerificationTime": 42.5,
      "avgResendCount": 0.35
    },
    "providerPerformance": [
      {
        "provider": "twilio",
        "total": 80,
        "verified": 60,
        "failed": 2,
        "successRate": 75.0
      }
    ],
    "countryPerformance": [
      {
        "country": "India",
        "total": 120,
        "verified": 85,
        "successRate": 70.83
      }
    ],
    "operatorPerformance": [
      {
        "operator": "zain",
        "total": 120,
        "verified": 85,
        "successRate": 70.83
      }
    ],
    "dailyTrends": [
      {
        "date": "2026-07-04",
        "count": 45
      }
    ],
    "hourlyTrends": [
      {
        "hour": "2026-07-04 10:00:00",
        "count": 12
      }
    ],
    "topFailedCampaigns": [
      {
        "campaignId": 1,
        "campaignName": "India / zain",
        "total": 120,
        "failed": 5,
        "failureRate": 4.17
      }
    ],
    "funnel": {
      "requested": 120,
      "sent": 115,
      "verified": 85,
      "subscribed": 78
    }
  }
  ```

---

## 3. Visualization Features

The dashboard uses high-fidelity pure-SVG and CSS visualizations:
- **Conversion Funnel**: Displays step-by-step conversions and percentage drop-offs (`Requested` ➔ `Sent` ➔ `Verified` ➔ `Subscribed`).
- **Trend Charts**: Renders glowing curved line plots for daily counts (30 days) and hourly counts (last 24 hours).
- **Comparison Heatmaps**: Direct tables comparing success ratios across provider gateways, countries, and operators.
- **Top Failed Campaigns Grid**: Highlights operators experiencing abnormal failed counts or block rates to facilitate rapid operator debugging.
