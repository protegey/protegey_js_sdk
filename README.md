# @protegey/sdk

Official Protegey SDK for JavaScript/TypeScript. One package for Node.js, the browser (React, Angular, plain JS), and React Native — device intelligence, transaction reporting, identity verification and behavioral biometrics, called directly from your app with your own API key.

## Install

Not yet published to npm — install directly from GitHub for now:

```bash
npm install git+https://github.com/protegey/protegey_js_sdk.git
# or pin a specific commit/tag: git+https://github.com/protegey/protegey_js_sdk.git#v0.1.0
```

Once published, this becomes:

```bash
npm install @protegey/sdk
```

Source: [github.com/protegey/protegey_js_sdk](https://github.com/protegey/protegey_js_sdk)

## Usage

```ts
import { Protegey } from "@protegey/sdk";

const protegey = new Protegey({ apiKey: "YOUR_API_KEY", baseUrl: "https://api.protegey.com" });

// Device intelligence — call on login / session start.
// In a browser, this computes a real device fingerprint automatically.
const { visitorId, action, riskScore } = await protegey.device.identify({
  externalCustomerId: "cust-9981",
  phoneNumber: "+22890000001", // optional — you already have it, never read off the device
});

// Transactions
const result = await protegey.transactions.report({
  externalTransactionId: "tx-00234",
  externalCustomerId: "cust-9981",
  customerName: "Awa Diallo", // self-declared, shows up directly in the Pan Studio transactions table
  direction: "DEBIT",
  amount: 250000,
  currency: "XOF",
  transactionType: "cashout",
  isCash: true,
  visitorId, // fold the same device signal into this transaction's decision
});
// result.decision: "CLEAR" | "REVIEW" | "BLOCKED"; result.alerts: the alerts it raised
const page = await protegey.transactions.list({ decision: "BLOCKED", page: 1, limit: 20 });
const tx = await protegey.transactions.get("tx-00234"); // Protegey id or your own externalTransactionId
// Note: `amount` is a decimal string ("250000.00") in list results.

// Alerts — triage from your own back office
const open = await protegey.alerts.list({ status: "OPEN" }); // pass UPPERCASE; the SDK sends the casing the API expects
await protegey.alerts.update(open.data[0].id, { status: "CONFIRMED", disposition: "CONFIRMED_FRAUD" });
const { case: createdCase } = await protegey.alerts.convertToCase(open.data[0].id);
await protegey.alerts.flagTransaction(result.transactionId); // Protegey transaction uuid, not your external id

// Identity verification (KYC) — the SDK starts the session and hands back the hosted link
const { sessionId, url: verificationUrl } = await protegey.kyc.startSession({
  externalUserId: "cust-9981",
  phone: "+22890000001", // optional, as is `email`
});
const current = await protegey.kyc.getSession(sessionId); // status, outcome, decision, photos
await protegey.kyc.listSessions({ status: "IN_REVIEW" });
await protegey.kyc.updateSession(sessionId, { status: "APPROVED", reviewNote: "Document checked by hand" });
const { url: freshLink } = await protegey.kyc.resendSession(sessionId); // new 30-minute link

// Business onboarding (KYB) — invite by email and/or phone (at least one)
const invited = await protegey.kyb.inviteApplicant({ contactName: "Kofi Mensah", contactPhone: "+233200000000" });
// Protegey only emails the link when contactEmail is set — send invited.applicationUrl yourself otherwise (SMS, WhatsApp, ...)
const applicant = await protegey.kyb.getApplicant(invited.id); // includes `submission` once they've responded
const screening = await protegey.kyb.screenApplicant(invited.id); // sanctions/PEP: business + each owner
await protegey.kyb.decide(invited.id, { decision: "REQUEST_MORE_INFO", note: "Please upload your licence" });
// -> { ..., status: "MORE_INFO_REQUIRED", applicationUrl } (applicationUrl only for REQUEST_MORE_INFO)
await protegey.kyb.resendInvitation(invited.id); // -> the submission + a fresh applicationUrl

// Sanctions / PEP screening of a single name
const hit = await protegey.sanctions.screen({ name: "John Doe", type: "person" }); // type is lowercase
// hit.decision: "BLOCKED" | "REVIEW" | "CLEAR"; hit.pepMatch; hit.matches[]

// Shared fraud signal network (must be enabled on your account for 7 days first)
const signal = await protegey.sharedSignals.check({ phoneNumber: "+22890000001", externalCustomerId: "cust-9981" });
// { flagged, category, reportedDaysAgo, flagConfidence, matchCount, matches: [{ category, reportedDaysAgo }] }

// Behavioral biometrics — aggregated keystroke/touch/navigation metadata only, never raw content
const behavioral = await protegey.behavioral.report({
  externalCustomerId: "cust-9981",
  sessionId: "sess-20260115-01",
  keystroke: { avgInterKeyLatencyMs: 145, typingSpeedCharsPerSec: 4.2, errorRate: 0.02 },
  touch: { avgSwipeVelocity: 22, scrollBehaviorScore: 0.8 },
  navigation: { screenSequence: ["login", "dashboard", "transfer", "confirm"] },
});
// behavioral.status === "LEARNING" for the first few sessions of any given customer — expected, not an error.
// Once scored: behavioral.stepUpRecommended tells you whether to challenge this user yourself (OTP, biometric, ...).
```

## Errors

Every non-2xx response throws `ProtegeyApiError` with `status`, `message` (validation messages
joined with ", "), `errorCode` and the raw `body`. `errorCode` is set for the account-gating 403s:
`PARTNER_SUSPENDED` and `PARTNER_CONTRACT_REQUIRED` (both only block write calls; reads keep
working). A duplicate `externalTransactionId` is a 409.

## Sandbox vs live

There's no flag to set: the API key you pass decides. Your sandbox key sees only sandbox KYC
sessions, transactions and alerts, and is limited to 100 transactions and 10 KYC sessions per day
(UTC). KYB, sanctions screening and alert updates are not split by mode.

## Webhooks

Protegey POSTs JSON events to your webhook URL, signed with your webhook secret:
`X-Signature = hex(HMAC_SHA256(secret, "{X-Timestamp}.{rawBody}"))`. Verify against the **raw**
request body, server-side only (never ship the secret to a browser):

```ts
import express from "express";
import { constructWebhookEvent } from "@protegey/sdk";

app.post("/webhooks/protegey", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = await constructWebhookEvent({
      rawBody: req.body, // Buffer — not a re-serialized object
      signature: req.header("X-Signature"),
      timestamp: req.header("X-Timestamp"),
      secret: process.env.PROTEGEY_WEBHOOK_SECRET!,
    });
  } catch {
    return res.sendStatus(400);
  }
  // Deduplicate on event.eventId — failed deliveries are retried up to 5 times over ~3 hours.
  switch (event.type) {
    case "kyc.status_changed": /* event.status: APPROVED | IN_REVIEW | DECLINED; correlate on event.externalUserId */ break;
    case "kyb.status_changed": /* event.clientId, event.status, event.decision */ break;
    case "alert.created":
    case "alert.status_changed": /* event.alertId, event.status */ break;
    case "transaction.blocked": /* event.transactionId, event.amount (a number here) */ break;
    case "webhook.test": break;
  }
  res.sendStatus(200);
});
```

`verifyWebhookSignature()` returns a boolean instead of throwing. Both reject deliveries whose
timestamp is more than 5 minutes off (`toleranceSeconds` to change). Note that
`kyc.status_changed.sessionId` is always null for FaceTec sessions — correlate on `externalUserId`.

## `baseUrl` — no default, on purpose

This package ships inside apps (especially mobile) that can't be force-updated the moment
Protegey's own API domain changes. Baking in a guess would risk every already-shipped app
silently talking to a stale host later — so `baseUrl` is required, with no fallback. Confirm the
current value with Protegey before you ship (it can differ between environments and change
independently of this package's version).

## Outside the browser (Node.js, React Native)

`device.identify()` needs a DOM to compute a real fingerprint. Outside a browser there's no DOM,
so it falls back to a fresh random id on every call — fine for a quick check, but not a stable
per-device identifier. If you have your own persistent id (e.g. one you store with AsyncStorage
on React Native, or generate once per server-side account), pass it explicitly:

```ts
await protegey.device.identify({ visitorId: myStoredDeviceId, externalCustomerId: "cust-9981" });
```

## What's in v0.7

The full partner API (all 23 endpoints):

- `protegey.device.identify()` — device/session intelligence.
- `protegey.transactions.report()` / `.list()` / `.get()` — transaction monitoring.
- `protegey.alerts.list()` / `.get()` / `.update()` / `.flagTransaction()` / `.convertToCase()` — alert triage.
- `protegey.kyc.startSession()` / `.listSessions()` / `.getSession()` / `.updateSession()` / `.resendSession()` — identity verification.
- `protegey.kyb.inviteApplicant()` / `.listApplicants()` / `.getApplicant()` / `.resendInvitation()` / `.screenApplicant()` / `.decide()` — business onboarding.
- `protegey.sanctions.screen()` — sanctions/PEP name screening.
- `protegey.sharedSignals.check()` — cross-partner shared fraud signal network.
- `protegey.behavioral.report()` — behavioral biometrics (keystroke/touch/navigation/session).
- `verifyWebhookSignature()` / `constructWebhookEvent()` — webhook verification + typed events.

## Security note

Your API key is used directly from your app (browser or mobile) — the same key your backend would
otherwise use server-side. Keep it out of source control and public repos the same way you would
any other secret. Protegey does not perform request rate-limiting or origin allowlisting on your
behalf today.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```
