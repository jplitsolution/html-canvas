# Runtime OTP Execution Engine

The runtime execution engine connects public users to campaign-configured SMS provider setups.

## Execution Flows

### 1. Local OTP Mode
```
Generate random code -> Hash & save in DB -> Send SMS via Provider -> Input OTP -> Compare locally -> Verification Success
```
- OTP Service generates a cryptographically random 6-digit code.
- Plaintext code is passed to the SMS adapter.
- The hashed representation is persisted in `otp_requests`.
- User inputs code, which is hashed with salt and compared locally.

### 2. Partner API Mode
```
Trigger Partner Send API -> Partner sends SMS -> Store Txn ID -> Input OTP -> Call Partner Verify API -> Success
```
- The partner API generates and sends the OTP.
- The backend stores the returned transaction reference in `providerRequestId`.
- Verification triggers the partner's verification endpoint.
