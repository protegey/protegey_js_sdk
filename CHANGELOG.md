## 0.6.0

- `StartKycSessionInput` gains `email` and `phone` — both optional, feed Protegey's cross-partner identity-resolution matching alongside `externalUserId`.
- `KycSessionStatus` (the `kyc.getSession()` response) gains `fullName`, `documentType`, `country`, `livenessScore`, `faceMatchScore`, `documentPhoto`, `documentBackPhoto`, `selfiePhoto`, `documentFaceCrop` — these were already returned by the backend but missing from the type. Also corrected its doc comment: this is the GET-response shape, not the same shape as the outbound `kyc.status_changed` webhook payload (the webhook's payload is narrower and has no top-level `outcome`).
- `ReportTransactionInput.segment` is now typed against the new exported `CustomerSegment` union (`'KYC1' | 'KYC2' | 'AGENT' | 'SUPER_AGENT' | 'MERCHANT' | 'CORPORATE'`) instead of a loose `string`.
- `DeviceAttributes` gains `manufacturer`, `totalStorageMb`, `freeStorageMb`, `batteryLevel`, `isCharging`, `isVpnActive` — all optional. The browser fingerprint path still doesn't populate these (no browser API backs them reliably), but native/React Native callers can now fill them in from platform device-info APIs.
- Fixed a stale doc comment pointing at a nonexistent `protegey-backend/src/keverd/...` path — corrected to `protegey-backend/src/device-intelligence/dto/device-attributes.dto.ts`.

## 0.5.0

- `ReportTransactionInput` gains `customerName` — shows up directly in the Pan Studio transactions table instead of just the opaque `externalCustomerId`. Self-declared, never verified by Protegey. Send it once and it's remembered on this customer's later transactions too, even if you omit it on some of them.

## 0.4.0

- `ReportTransactionInput` gains `accountBalanceBefore` — lets a Pan Studio rule flag a withdrawal/transfer that drains most of the account balance, a classic mule-account/account-drain signal. Omit it and the corresponding rule field simply never fires.

## 0.3.0

- `ReportTransactionInput` gains `lastPasswordChangeAt`, `lastEmailChangeAt`, `lastPhoneChangeAt` (ISO 8601) — lets a Pan Studio rule flag a large transaction shortly after an account credential change, a classic account-takeover pattern. `lastPhoneChangeAt` also covers a SIM swap for telcos. Omit any of them and the corresponding rule field simply never fires — Protegey never guesses this.

## 0.2.0

- `ReportTransactionInput` gains `channel` (new `TransactionChannel` type: branch/atm/pos/online/mobile_app/ussd/agent/api/call_center), `counterpartyInstitutionCode`, and `counterpartyCountry` — lets Pan Studio rules target bank-wire and cross-border scenarios, not just mobile-money structuring.

## 0.1.0

- Initial release.
- `protegey.device.identify()` — device/session intelligence (real browser fingerprinting via ThumbmarkJS, wrapped internally).
- `protegey.transactions.report()` — transaction monitoring.
- `protegey.kyc.startSession()` / `protegey.kyc.getSession()` — identity verification + webhook-polling fallback.
- `protegey.behavioral.report()` — behavioral biometrics.
- `baseUrl` is a required constructor option, with no built-in default — see the README for why.
