# OTP Provider Configuration Guide

Each provider requires specific parameters to be stored as a JSON string inside `otp_config_json`.

## 1. Twilio Config
```json
{
  "accountSid": "ACxxxxxx",
  "authToken": "xxxxxxxx",
  "from": "+1234567890",
  "messageTemplate": "Your verification code is {{otp}}"
}
```

## 2. MSG91 Config
```json
{
  "authKey": "xxxxxx",
  "templateId": "xxxxxx",
  "sender": "SNDRNAME"
}
```

## 3. Kaleyra Config
```json
{
  "apiKey": "xxxxxx",
  "sender": "SNDRNAME",
  "region": "global",
  "messageTemplate": "Your code is {{otp}}"
}
```

## 4. Partner API Config
```json
{
  "sendUrl": "https://telecom.com/api/send?msisdn={{phone}}",
  "verifyUrl": "https://telecom.com/api/verify?msisdn={{phone}}&otp={{otp}}",
  "method": "POST",
  "verifyMethod": "POST",
  "headersJson": "{\"Authorization\":\"Bearer xxxx\"}",
  "bodyJson": "{\"campaign\":\"{{campaign}}\"}",
  "verifyBodyJson": "{\"referenceId\":\"{{providerRequestId}}\"}"
}
```

## 5. Custom HTTP Config
```json
{
  "url": "https://my-sms-gateway.com/send",
  "method": "POST",
  "headersJson": "{\"Content-Type\":\"application/json\"}",
  "bodyJson": "{\"recipient\":\"{{phone}}\",\"text\":\"Your code is {{otp}}\"}"
}
```
