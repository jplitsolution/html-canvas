# Callback Deduplication & Reporting Architecture Plan

## 1. Executive Summary & Recommendation

### Question:
> *Kya count badhna chahiye ya nahi? Ya logs ko waise hi rehne dein aur count ko ek hi baar aana chahiye?*

### Recommendation (Industry Standard & Best Practice):
1. **Logs ko WAISA HI REHNE DEIN (`api_call_logs` me har hit record ho):**
   - Operator / Aggregator (Telco) network glitches ya retry policies ki wajah se ek hi conversion ke 2 ya 3 callbacks bhejte hain.
   - Audit trail, forensic debugging, aur dispute settlement ke liye raw HTTP requests ka poora record rehna zaroori hai. **Logs ko kabhi discard ya de-duplicate nahi karna chahiye.**

2. **Metrics & Dashboard Count ko UNIQUE (De-duplicated) KARNA CHAHIYE:**
   - Business dashboard par **"Callbacks Received"** ka matlab hota hai: *"Kitne actual users/subscribers ka billing confirm hua"*.
   - Agar ek hi user ke 2 callbacks aane se count badh jaata hai:
     - CG / Landing CG campaigns me `ConversionRule = operator_callback` hota hai, jisse **conversions artificially double count** ho jaate hain.
     - Analytics reports aur conversion rates (CR%) skew ho jaate hain.
   - Isliye reporting count **Unique Transactions / Distinct IDs** par calculate hona chahiye.

3. **Ideal Solution (Best of Both Worlds):**
   - **Primary Metric:** `Unique Callbacks Received` (Unique conversions).
   - **Secondary Info (Subtext/Hover):** `Total Hits / Webhook Requests` (e.g. *"100 unique (115 total hits)"*), jisse developer ko retry rate bhi pata chale aur business reporting bhi accurate rahe.

---

## 2. Root Cause Analysis (Current System Gap)

### 2.1 Postback Delivery vs Analytics Count Discrepancy
| Area | Current Behavior | Problem |
| :--- | :--- | :--- |
| **Vendor Postback Firing** | Duplicate callback par `already sent` check chalta hai; vendor ko postback dobara nahi jaata. | ✅ Working correctly (No double payout). |
| **Postback Table (`conversion_postbacks`)** | Same `click_id` ya `msisdn` aane par row update hoti hai (upsert), nayi row nahi banti. | ✅ Working correctly (1 row per transaction). |
| **Audit Logs (`api_call_logs`)** | Har incoming callback request ka ek naya log banta hai. | ✅ Working correctly (Complete audit trail). |
| **Dashboard `callbacksReceived` Query** | `postback-query.js` runs `COUNT(*)` on `api_call_logs`. | ❌ **Bug:** Multiple hits = inflated count. |
| **Daily Stats `billingReceived` Query** | `daily-stats.service.js` runs `COUNT(*)` on `api_call_logs`. | ❌ **Bug:** Inflates CG flow conversions count. |

---

## 3. Implementation Blueprint

### Phase 1: Metrics De-duplication in `postback-query.js`

**File:** `html-canvas/backend/src/modules/partners/helpers/postback-query.js`

#### Current Logic (Lines ~322–332):
```javascript
const cbRows = await cbQ
  .select(statusExpr, 'operatorStatus')
  .addSelect('COUNT(*)', 'cnt')
  .groupBy(statusExpr)
  .getRawMany();
```

#### Proposed Change:
1. Identifier coalesce expression banayein:
   ```sql
   COALESCE(NULLIF(l.clickId, ''), l.msisdn, CAST(l.visitId AS VARCHAR))
   ```
2. Unique callbacks count calculate karein:
   ```javascript
   // Unique distinct transactions
   const uniqueExpr = `COALESCE(NULLIF(l.click_id, ''), l.msisdn, CAST(l.visit_id AS VARCHAR))`;
   
   // Total raw hits (for retry analysis)
   // Unique callbacks count
   const [summaryRow] = await cbQ
     .select(`COUNT(DISTINCT ${uniqueExpr})`, 'uniqueCount')
     .addSelect('COUNT(*)', 'rawHits')
     .getRawMany();
   ```
3. Status breakdown ke liye:
   - Duplicate callback aane par aksar status update hota hai (e.g., 1st callback: `grace`, 2nd callback: `active`).
   - Best approach: Status breakdown `conversion_postbacks` ke `operatorStatus` se lein (jo already unique rows hain aur latest status store karti hain), ya log table me window function / latest record se group karein.

---

### Phase 2: Daily Stats Aggregation in `daily-stats.service.js`

**File:** `html-canvas/backend/src/modules/analytics/daily-stats.service.js`

#### Current Logic (Lines ~216–233):
```javascript
const billingLogRows = await getApiCallLogRepo()
  .createQueryBuilder('l')
  .leftJoin(Visit, 'v', 'v.id = l.visitId')
  .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
  .addSelect('v.vendorId', 'vendorId')
  .addSelect('COUNT(*)', 'cnt') // <--- Flaw: counts all raw hits
  .where('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
  .andWhere('l.success = :ok', { ok: true })
  .groupBy(...)
```

#### Proposed Change:
Count only distinct transactions:
```javascript
const distinctKey = `COALESCE(NULLIF(l.click_id, ''), l.msisdn, CAST(l.visit_id AS VARCHAR))`;

const billingLogRows = await getApiCallLogRepo()
  .createQueryBuilder('l')
  .leftJoin(Visit, 'v', 'v.id = l.visitId')
  .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
  .addSelect('v.vendorId', 'vendorId')
  .addSelect(`COUNT(DISTINCT ${distinctKey})`, 'cnt') // <--- Fix: distinct transactions only
  .where('l.createdAt BETWEEN :from AND :to', { from, to })
  .andWhere('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
  .andWhere('l.success = :ok', { ok: true })
  .andWhere('l.visitId IS NOT NULL')
  .groupBy('l.campaignId')
  .addGroupBy('v.campaignId')
  .addGroupBy('v.vendorId')
  .getRawMany();
```
*Effect:* Isse CG flows me `conversions = metrics.billingReceived` accurate ho jayega aur duplicate hits conversions ko inflate nahi karenge.

---

### Phase 3: Status Breakdown Conflict Resolution

Jab same number se do baar callback aata hai alag status ke saath:
- **Hit 1 (14:00):** status = `grace`
- **Hit 2 (14:02):** status = `active`

#### Rule:
- Latest status wins.
- Database entity `ConversionPostback` already row ko latest status (`active`) se update karti hai.
- Status breakdown card me `active: 1` aana chahiye, na ki `grace: 1, active: 1` (jis se total count 2 dikhe).

---

### Phase 4: Frontend UI Clarification

#### 1. Dashboard (`DashboardPage.jsx`):
- Card Title: **Callbacks Received** (Unique subscribers/conversions).
- Subtext: Agar raw hits zyada hain, toh show:
  *`1,050 unique (1,120 hits received)`*

#### 2. Postbacks Page (`PostbacksPage.jsx`):
- Header badge:
  *`{summary.callbacksReceived || 0} unique callbacks · {summary.rawCallbackHits || 0} total hits`*

---

## 4. Test Scenarios for Future Implementation

| Scenario | Input | Expected `api_call_logs` | Expected `callbacksReceived` | Expected `vendorSent` |
| :--- | :--- | :--- | :--- | :--- |
| **Single Callback** | 1 callback (Click A) | 1 log row | 1 | 1 (if active) |
| **Exact Duplicate** | 2 identical callbacks (Click A) | 2 log rows | 1 (Distinct) | 1 (Already sent) |
| **Status Upgrade** | 1st: `grace`, 2nd: `active` | 2 log rows | 1 (Distinct) | 1 (Fired on active) |
| **Unmatched Duplicate** | 2 callbacks with unknown click | 2 log rows | 1 (Distinct unmatched) | 0 |
| **Different Users** | Callback Click A + Callback Click B | 2 log rows | 2 | 2 |

---

## 5. Summary Checklist Before Coding
- [ ] Retain all `api_call_logs` raw rows for telco dispute checks.
- [ ] Add `COUNT(DISTINCT ...)` in `postback-query.js`.
- [ ] Add `COUNT(DISTINCT ...)` in `daily-stats.service.js`.
- [ ] Return both `callbacksReceived` (unique) and `callbackHits` (raw) in stats response.
- [ ] Update frontend labels to clearly indicate unique vs total hits.
- [ ] Run backend unit tests (`postback-query.test.js`, `daily-stats.test.js`).
