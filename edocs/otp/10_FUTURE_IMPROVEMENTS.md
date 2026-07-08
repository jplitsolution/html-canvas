# Future OTP Architecture Improvements

This document lists future engineering improvements to scale, optimize, and secure the TemplateCraft OTP subsystem.

## Recommended Enhancements

1. **Redis caching for rate limits**: Move rate-limit lookups from the primary relational database to a Redis cache layer for sub-millisecond throttle validation.
2. **IP-based geo-blocking**: Block ranges or specific countries at the infrastructure proxy level if they generate high-frequency failures or automated verification requests.
3. **Fallback routing rules**: Configure automated failover between multiple SMS providers (e.g. if Twilio fails or returns error codes, instantly route subsequent sends through MSG91).
4. **Alphanumeric Sender Verification**: Implement automated provider checks for international sender name registration based on target countries.
5. **WebSocket Telemetry**: Stream real-time OTP conversions, bounces, and carrier network queues directly to the Campaign analytics dashboard.
