## 0.8.0

Brings the SDK in line with the November 2026 partner API.

**New endpoints**
- `protegey.cashDeposits` (new namespace): `record()` (POST `/partner-api/cash-deposits`), `list()` (filters `dateFrom`, `dateTo`, `externalCustomerId`, `minAmount`, `maxAmount`, `currency`, `channel`, `decision`, `branchId`, `agentId`, `page`, `limit` ≤ 100) and `get()` (by `cashDepositId` or your `externalTransactionId`, with its alerts). A duplicate `externalTransactionId` throws a 409 `ProtegeyApiError`. `amount` is a decimal string in `list()`/`get()` results. New types: `RecordCashDepositInput`, `RecordCashDepositResult`, `ListCashDepositsQuery`, `CashDeposit`, `CashDepositDetail`, `CashDepositChannel`.

**KYC**
- `recommendation` (`KycRecommendation`: `APPROVE` | `REVIEW` | `REJECT` | `null`) on `listSessions()` rows, `getSession()`, `updateSession()` and the `kyc.status_changed` webhook — Protegey's own verdict, unchanged by a manual override (`status` is the final decision).
- `images` (`KycSessionImages`: `documentFront`, `documentBack`, `selfie`, `documentFaceCrop`, each `{ url, expiresAt } | null`) on `listSessions()` rows and `getSession()`. Pre-signed URLs valid **1 hour**, re-issued on every GET — download within the hour, never store the URL. The base64 photo fields remain on `getSession()`.
- `listSessions({ externalUserId })` — exact (case-sensitive) lookup of a customer's sessions.
- `updateSession()` docs: a status change now fires `kyc.status_changed`.

**Webhooks (type/doc fixes)**
- `kyc.status_changed`: `sessionId` is now the session id `startSession()` returned (typed `string`, was documented as always `null`); also sent on manual status changes; carries `recommendation`.
- `kyb.status_changed.submissionStatus` is now UPPER_SNAKE_CASE (`APPROVED` | `REJECTED` | `MORE_INFO_REQUIRED`).
- `KycManualReview.previousStatus` / `newStatus` are UPPER_SNAKE_CASE (typed `KycStatus` / `KycReviewStatus`).
- Retries: up to 5 attempts over ~3 hours, same `eventId` — deduplicate on it. Signature verification is unchanged.

## 0.7.0

Brings the SDK in line with the current partner API (all 23 endpoints). Contains breaking type changes (see below).

**New endpoints**
- `protegey.alerts` (new namespace): `list()`, `get()`, `update()`, `flagTransaction()`, `convertToCase()`. The `status`/`disposition` list filters take the UPPERCASE values and are sent lowercase, as the API requires.
- `protegey.kyb` (new namespace): `listApplicants()`, `getApplicant()`, `inviteApplicant()`, `resendInvitation()`, `screenApplicant()`, `decide()`. Invites take `contactEmail` and/or `contactPhone` (at least one, enforced in the type). Invite, resend and decide (REQUEST_MORE_INFO only) return `applicationUrl`. `resendInvitation()` returns the submission, not the business. The leaked internal fields `tokenHash` and `documentFilePath` are deliberately not modelled.
- `protegey.kyc`: `listSessions()` (the UPPERCASE `status` filter is converted to the Title Case value the API requires), `updateSession()` (PATCH, manual status override), `resendSession()`.
- `protegey.transactions`: `list()` and `get()` (by Protegey or external id).
- `protegey.sanctions.screen()` and `protegey.sharedSignals.check()` (with `governmentId` / `personIdentityId`; result has `flagConfidence`, `matchCount` and `matches: [{ category, reportedDaysAgo }]`).
- Webhooks: `verifyWebhookSignature()` / `constructWebhookEvent()` (HMAC-SHA256 hex over `{X-Timestamp}.{rawBody}`, 5-minute replay window) and a `WebhookEvent` union typing all six events (`kyc.status_changed`, `kyb.status_changed`, `alert.created`, `alert.status_changed`, `transaction.blocked`, `webhook.test`).

**Breaking type changes**
- `Alert` is now the exact alert record (no `[key: string]: unknown` index signature); `status` is `AlertStatus`, plus typed `decisionVerdict`, `disposition`, etc. `ReportTransactionResult.alerts` is `Array<Alert | AlertWithContext>`.
- `KycSessionStatus.status` is now the `KycStatus` union (was `string`); `decision` is the typed `KycDecision` (was `Record<string, unknown>`).
- `IdentifyResult.action` / `riskScore` are no longer nullable (the API always returns them).
- All types are now re-exported from the package root (`export type *`).

**Other**
- `ProtegeyApiError` gains `errorCode` (`PARTNER_SUSPENDED`, `PARTNER_CONTRACT_REQUIRED`) and the raw `body`.
- Docs: webhook delivery is retried up to 5 times over ~3 hours (the old "one retry, no queue" note was wrong); sandbox quotas documented.

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
