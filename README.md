# @protegey/sdk

Official Protegey SDK for JavaScript/TypeScript. One package for Node.js, the browser (React, Angular, plain JS), and React Native — device intelligence and transaction reporting, called directly from your app with your own API key.

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
  direction: "DEBIT",
  amount: 250000,
  currency: "XOF",
  transactionType: "cashout",
  isCash: true,
  visitorId, // fold the same device signal into this transaction's decision
});
```

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

## What's in v0.1

- `protegey.device.identify()` — device/session intelligence.
- `protegey.transactions.report()` — transaction monitoring.

More of the Protegey API surface (behavioral events, shared-signal checks, ...) will be added as
additional namespaces without breaking this shape.

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
