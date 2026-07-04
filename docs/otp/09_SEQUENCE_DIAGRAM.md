# OTP Sequence Diagrams

This document visually illustrates the transaction sequence flows.

## 1. Local OTP Flow (Twilio, MSG91, Kaleyra, Custom HTTP)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile Consumer
    participant Client as Frontend Shadow DOM
    participant Server as NestJS Backend
    participant DB as Relational Database
    participant Gateway as SMS Provider Gateway

    User->>Client: Inputs phone & clicks "Get OTP"
    Client->>Server: POST /otp/send (phone, visitId)
    Server->>DB: Resolves campaign & provider credentials
    Server->>Server: Generates random code & hashes
    Server->>Gateway: Dispatched SMS body (code, message)
    Gateway-->>Server: Response (providerRequestId)
    Server->>DB: Saves OtpRequest (status: sent, otp_hash)
    Server-->>Client: Returns success response (otp code omitted in prod)
    Client->>Client: Starts 60s Resend countdown lock
    User->>Client: Inputs OTP & clicks "Verify"
    Client->>Server: POST /otp/verify (phone, otp, visitId)
    Server->>DB: Finds active OTP request
    Server->>Server: Computes hash & compares
    Server->>DB: Updates OtpRequest status: verified
    Server-->>Client: Returns success
    Client->>Server: POST /flow/transition (OTP -> CONTINUE)
    Server->>DB: Checks if verified session exists
    Server-->>Client: Returns CONFIRM page HTML
```

## 2. Partner API Flow (Telecom Operator OTP)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile Consumer
    participant Client as Frontend Shadow DOM
    participant Server as NestJS Backend
    participant DB as Relational Database
    participant Partner as Partner Telecom Gateway

    User->>Client: Inputs phone & clicks "Get OTP"
    Client->>Server: POST /otp/send (phone, visitId)
    Server->>DB: Resolves partner credentials
    Server->>Partner: Calls Partner Send API (phone, variables)
    Partner->>User: Dispatches operator-generated SMS
    Partner-->>Server: Returns reference transaction ID
    Server->>DB: Saves OtpRequest (status: sent, txn ID)
    Server-->>Client: Returns success response
    User->>Client: Inputs operator code & clicks "Verify"
    Client->>Server: POST /otp/verify (phone, otp, visitId)
    Server->>DB: Finds active OtpRequest reference ID
    Server->>Partner: Calls Partner Verify API (phone, otp, txn ID)
    Partner-->>Server: Verification OK
    Server->>DB: Updates OtpRequest status: verified
    Server-->>Client: Returns success
    Client->>Server: POST /flow/transition (OTP -> CONTINUE)
```
