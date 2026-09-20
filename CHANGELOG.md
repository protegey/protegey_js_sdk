## 0.1.0

- Initial release.
- `protegey.device.identify()` — device/session intelligence (real browser fingerprinting via ThumbmarkJS, wrapped internally).
- `protegey.transactions.report()` — transaction monitoring.
- `protegey.kyc.startSession()` / `protegey.kyc.getSession()` — identity verification + webhook-polling fallback.
- `protegey.behavioral.report()` — behavioral biometrics.
- `baseUrl` is a required constructor option, with no built-in default — see the README for why.
