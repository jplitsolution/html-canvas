# Operational Project Flows

This document traces the complete, end-to-end operational flows of TemplateCraft, detailing data exchanges between the client, server, database, and third-party APIs.

---

## 1. Administrative Setup Flow

```
[ Admin User ]                 [ Backend Server ]               [ Database (TypeORM) ]
      │                                │                                  │
      │ 1. POST /campaigns             │                                  │
      │    (country, operator, copy)   │                                  │
      ├───────────────────────────────►│                                  │
      │                                │ 2. Verify unique (country, op)   │
      │                                ├─────────────────────────────────►│
      │                                │◄─────────────────────────────────┤ (No conflict)
      │                                │                                  │
      │                                │ 3. Create Campaign row           │
      │                                ├─────────────────────────────────►│
      │                                │                                  │
      │                                │ 4. Clone or seed default pages   │
      │                                │    (HOME, CONFIRM, OTP,          │
      │                                │     THANKYOU, BLOCKED, ERROR)    │
      │                                ├─────────────────────────────────►│
      │                                │◄─────────────────────────────────┤ (Success)
      │ 5. Returns Campaign details    │                                  │
      │◄───────────────────────────────┤                                  │
```

---

## 2. Visual Editor Save & Page Compilation Flow

1. **Administration Editing**: The editor loads the GrapeJS layout from the `campaign_pages` template configuration.
2. **Compilation**: When the administrator clicks **Save**:
   - GrapesJS extracts raw project structure JSON data (`editor.getProjectData()`).
   - Retrieves active CSS rules and compiled HTML code.
3. **Persisting**: The client dispatches a `PATCH` request to `/campaigns/:id/pages/:pageType`.
4. **Database Sync**: The backend updates the `templates` database record data payload:
   ```json
   {
     "editor": "grapesjs",
     "projectData": { ... },
     "html": "Compiled HTML string",
     "css": "Active CSS rules string"
   }
   ```

---

## 3. Public Traffic Funnel Routing Flow

This sequence handles incoming traffic to campaigns and compiles templates dynamically.

```
[ Mobile User ]              [ Flow Controller ]             [ Partner API Proxy ]           [ Database ]
      │                               │                               │                           │
      │ 1. GET /flow/page?country...  │                               │                           │
      ├──────────────────────────────►│                               │                           │
      │                               │ 2. Find active Campaign row   │                           │
      │                               ├───────────────────────────────┼──────────────────────────►│
      │                               │◄──────────────────────────────┼───────────────────────────┤
      │                               │                               │                           │
      │                               │ 3. Log Visit record (status: VISIT)                       │
      │                               ├───────────────────────────────┼──────────────────────────►│
      │                               │                               │                           │
      │                               │ 4. POST /checkSubscription    │                           │
      │                               ├──────────────────────────────►│                           │
      │                               │◄──────────────────────────────┤                           │
      │                               │    (Returns: subscribed=false)│                           │
      │                               │                               │                           │
      │                               │ 5. Interpolate variables (e.g. {{operator}})              │
      │                               │ 6. Render template HTML/CSS   │                           │
      │ 7. Return page and variables  │                               │                           │
      │◄──────────────────────────────┤                               │                           │
```

---

## 4. State Transition & Billing Funnel Flow

This sequence traces actions when a user proceeds to subscribe.

### 4.1 Funnel Step Transition (`POST /flow/transition`)
1. **Transition Action**: The mobile user clicks the subscription button or image hotspot (`data-action="SUBSCRIBE"`).
2. **Evaluation**:
   - If the user's mobile number (`phone` / MSISDN) is detected (from headers or URL parameters):
     - The backend advances the funnel state to **`CONFIRM`**.
     - Logs a `CONFIRM_SHOWN` status update and returns page data for the `CONFIRM` page.
   - If the mobile number is not detected:
     - The backend routes the user to the **`OTP`** gate.
     - Logs `OTP_SHOWN` and returns the OTP input page.

### 4.2 OTP Verification & Transition
1. **OTP Verification**: If the user is on the `OTP` page, they input their mobile number and click "Get OTP".
   - The frontend calls `POST /otp/send`. Code is dispatched.
   - The user inputs the code and clicks "Verify". The frontend calls `POST /otp/verify`.
2. **Verification & Transition**: On success, the frontend calls `POST /flow/transition` with `fromPage = OTP` and `action = CONTINUE`.
   - The backend checks the database to verify the OTP request has `status = 'verified'` for that phone and visit session.
   - On verification match, the backend updates visit status to `CONFIRM_SHOWN` and returns the `CONFIRM` page details.

### 4.3 Subscription Confirmation & Billing Check
1. **Submission**: The user selects a pack (daily, weekly, or monthly) on the `CONFIRM` page and clicks the submit button (`data-action="CONFIRM"`).
2. **Blocklist Guard**: The backend triggers a request to the external blocklist API configured for the campaign:
   - If blocklisted (or test phone starts with `999`):
     - The visit is updated to `BLOCKED`.
     - Logs a `BLOCKED` event and returns the `BLOCKED` template.
3. **Duplicate Subscription Guard**: The backend double-checks the active subscription API:
   - If already active:
     - Routes the user to the `THANKYOU` page immediately with status `ALREADY_SUBSCRIBED`.
4. **Billing Action Request**: The backend calls the integration charge API:
   - **Successful Charge**:
     - The visit status is updated to `SUCCESS`.
     - Logs a `SUBSCRIBE_SUCCESS` event.
     - Returns the `THANKYOU` page data.
   - **Failed Charge** (e.g. insufficient carrier balance):
     - The visit status is updated to `FAILED`.
     - Logs a `SUBSCRIBE_FAILED` event.
     - Returns the `ERROR` page data.
