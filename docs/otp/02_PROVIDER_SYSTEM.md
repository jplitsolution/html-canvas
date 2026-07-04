# OTP Provider Integration System

The provider integration system is built on a stateless adapter pattern. It decouples the core OTP service from gateway APIs.

## The `SmsProvider` Interface

All gateways implement the standard `SmsProvider` interface defined in [sms-provider.interface.ts](file:///d:/dddd/backend/src/modules/otp/providers/sms-provider.interface.ts):

```typescript
export interface SmsProvider {
  sendOtp(
    phone: string,
    otp: string,
    config: any,
    context: SmsProviderContext,
  ): Promise<SmsProviderSendResult>;

  verifyOtp?(
    phone: string,
    otp: string,
    providerRequestId: string,
    config: any,
  ): Promise<SmsProviderVerifyResult>;
}
```

## Provider Implementation Registry

- **Twilio Provider**: Connects to the Twilio REST API using standard Basic Auth. Sends parameters as URL-encoded values.
- **MSG91 Provider**: Connects to control.msg91.com REST endpoints using API-key authentication header and JSON payload.
- **Kaleyra Provider**: Supports Kaleyra global JSON POST endpoints and GET query parameters for Kaleyra EU operators.
- **Partner Provider**: Passes remote send/verify parameters to telecom operator gateways which generate and track verification codes themselves.
- **Custom HTTP Provider**: A generic gateway allowing administrators to specify arbitrary URLs, headers, payloads, and methods, dynamically replacing placeholders like `{{phone}}`, `{{otp}}`, and `{{campaign}}`.
