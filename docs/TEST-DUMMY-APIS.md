# Dummy test APIs — campaign paste values

Local dummy partner APIs (`/api/test`) so you can run the full HE / OTP funnel without a real operator.

Base: `http://localhost:3000` (same as `./dev.sh` backend).

Open the campaign → **Integration & Settings**.

---

## 1. Checksub tab

| Field | Paste this |
|---|---|
| **Subscription check URL (checksub)** | `http://localhost:3000/api/test/checksub?msisdn={{msisdn}}` |
| **Subscribe URL (Confirm / pack click)** | `http://localhost:3000/api/test/subscribe?msisdn={{msisdn}}&pack={{pack}}` |
| Checksub status mapping | leave empty (built-in mapping) |
| Blocklist / DND URL | leave empty |
| Headers (JSON) | leave empty |

Optional pack extras if you want them in the subscribe URL:

```
http://localhost:3000/api/test/subscribe?msisdn={{msisdn}}&pack={{pack}}&planId={{planId}}&serviceId={{serviceId}}&subServiceId={{subServiceId}}
```

---

## 2. Partner OTP tab

| Field | Paste this |
|---|---|
| **Send URL** | `http://localhost:3000/api/test/otp?msisdn={{msisdn}}` |
| **Verify URL** | `http://localhost:3000/api/test/otp/validate?msisdn={{msisdn}}&otp={{otp}}` |
| Send method | `GET` |
| Verify method | `GET` |
| Success key | `responseCode` |
| Success value | `0` |
| Headers (JSON) | leave empty |

OTP is printed in the **backend terminal** (`otp generated 123456`). Use that code on the OTP page.

---

## 3. Detect phone tab

| Field | Value |
|---|---|
| Mode | **Network header** (default) |
| Everything else | leave empty |

Local HE uses `HE_DUMMY_MSISDN` from `backend/.env` (currently `912416730`). Same dummy checksub/subscribe APIs run after that number is found.

For OTP-only testing you can set Detect phone → **Off**.

---

## What each dummy API returns

| API | Any number returns |
|---|---|
| Checksub | `currentStatus: "new"` → funnel continues (HOME / CONFIRM / OTP) |
| Subscribe | `responseCode: "0"`, `currentStatus: "active"` → thank you |
| OTP send | `responseCode: "0"` + `otp` in JSON (also logged in terminal) |
| OTP verify | `responseCode: "0"` if the code matches Redis |

HE vs OTP does not matter — only `{{msisdn}}` is used.

---

## Curl (optional)

```bash
curl "http://localhost:3000/api/test/checksub?msisdn=912416730"
curl "http://localhost:3000/api/test/subscribe?msisdn=912416730&pack=daily"
curl "http://localhost:3000/api/test/otp?msisdn=912416730"
curl "http://localhost:3000/api/test/otp/validate?msisdn=912416730&otp=123456"
```

---

## Do not use

Numbers starting with `999` — the flow engine treats them as blocked / subscribe-skip **before** these dummy APIs are called.
