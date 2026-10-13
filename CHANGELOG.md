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
