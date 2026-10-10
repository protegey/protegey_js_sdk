## 0.2.0

- `ReportTransactionInput` gains `channel` (new `TransactionChannel` type: branch/atm/pos/online/mobile_app/ussd/agent/api/call_center), `counterpartyInstitutionCode`, and `counterpartyCountry` — lets Pan Studio rules target bank-wire and cross-border scenarios, not just mobile-money structuring.

## 0.1.0

- Initial release.
- `protegey.device.identify()` — device/session intelligence (real browser fingerprinting via ThumbmarkJS, wrapped internally).
- `protegey.transactions.report()` — transaction monitoring.
- `protegey.kyc.startSession()` / `protegey.kyc.getSession()` — identity verification + webhook-polling fallback.
- `protegey.behavioral.report()` — behavioral biometrics.
- `baseUrl` is a required constructor option, with no built-in default — see the README for why.
