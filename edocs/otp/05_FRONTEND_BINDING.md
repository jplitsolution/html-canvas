# GrapesJS Frontend Action Bindings

To support dynamic OTP pages compiled via GrapesJS without hardcoding scripts in template files, a **Runtime Action Binding System** is implemented.

## Supported HTML Attributes

- **`data-action="send-otp"`** (or `data-otp-action="send"`): Bound to buttons that request OTP codes.
- **`data-action="verify-otp"`** (or `data-otp-action="verify"`): Bound to verification submission buttons.
- **`data-otp-field="phone"`** (or `data-field="phone"`): Read input for MSISDN value.
- **`data-otp-field="otp"`** (or `data-field="otp"`): Read input for verification code.
- **`data-otp-slot="error"`** (or `data-slot="error"`): Error message text target.
- **`data-otp-slot="status"`** (or `data-slot="status"`): Progress and success text target.

## Binding Engine Features

1. **State Locking**: Disables input triggers during API transactions.
2. **Resend Delay Timer**: Starts a 60-second visual countdown on the button after successful dispatch.
3. **Transition Trigger**: On verification success, advances the flow to `CONFIRM` automatically.
