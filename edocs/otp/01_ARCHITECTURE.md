# OTP Subsystem High-Level Architecture

This document describes the high-level architecture of the upgraded, production-ready OTP Subsystem in TemplateCraft.

## Conceptual Overview

The OTP engine is built using a clean, decoupled provider-based architecture. The core transaction flows remain stateless, and the billing/funnel logic does not need to know which SMS provider or telecom operator is being used.

```
                  +-----------------------+
                  |  FlowService / Route  |
                  +-----------+-----------+
                              |
                              v
                  +-----------+-----------+
                  |      OtpService       |
                  +-----------+-----------+
                              |
                              v
                  +-----------+-----------+
                  |  SmsProviderManager   |
                  +-----------+-----------+
                              |
         +--------------------+--------------------+
         |                    |                    |
         v                    v                    v
+--------+-------+   +--------+-------+   +--------+-------+
| TwilioProvider |   | MSG91Provider  |   | KaleyraProvider| ...
+----------------+   +----------------+   +----------------+
```

## Core Abstraction Layers

1. **Funnel Transitions (`FlowService`)**: Orchestrates checkout navigation, validating that users only reach the `CONFIRM` screen after successfully verifying their phone number (if header detection fails).
2. **OTP Business Engine (`OtpService`)**: Enforces rate limiting, resend delays, attempt tracking, cryptographic hashing, and triggers the corresponding provider wrapper.
3. **Provider Registry (`SmsProviderManager`)**: Dynamically resolves and returns the correct provider instance based on campaign-level configurations.
4. **SMS Gateway Adapters (`SmsProvider`)**: Stateless class wrappers communicating with third-party SMS providers (Twilio, MSG91, Kaleyra, Custom HTTP, Partner remote API).
