// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Conventions (mirrors the partner API exactly)
//
// - Every value under a key named status / decision / decisionVerdict / disposition / action /
//   deviceAction / category / outcome / ruleDecision / confidenceTier is UPPER_SNAKE_CASE in API
//   responses and webhook payloads. Every other enum-like key keeps the backend's own casing (e.g.
//   ruleSeverity, priority, source stay lowercase) — the types below say which. submissionStatus,
//   previousStatus and newStatus are UPPER_SNAKE_CASE too.
// - Dates are ISO-8601 strings.
// - A few list FILTERS only accept a specific casing on the wire; the SDK takes the same
//   UPPER_SNAKE_CASE values you get back in responses and converts them for you.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Every list endpoint: `page` ≥ 1 (default 1), `limit` 1–100 (default 20). */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/** Response shape of every list endpoint. `totalPages` is never below 1. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Device intelligence ─────────────────────────────────────────────────────────────────────────

/** Mirrors the backend's DeviceAttributesDto — a closed, all-optional list (unknown keys are
 * silently stripped server-side). Keep in sync with
 * protegey-backend/src/device-intelligence/dto/device-attributes.dto.ts. */
export interface DeviceAttributes {
  platform?: string;
  osVersion?: string;
  deviceModel?: string;
  userAgent?: string;
  screenWidth?: number;
  screenHeight?: number;
  timezone?: string;
  language?: string;
  appVersion?: string;
  isRooted?: boolean;
  isEmulator?: boolean;
  // ── Tier 1/2 enrichment ─────────────────────────────────────────────────────────────────────
  // fingerprint.ts (the browser fingerprint path) only ever populates the fields below this
  // comment up to totalMemoryMb — see that file for exactly why each one is (or isn't) available
  // per browser. manufacturer/storage/battery/VPN are NOT populated by fingerprint.ts (none are
  // reliably available to a browser), but are real fields a native/React Native caller can fill
  // in from the platform's own device-info APIs — left optional here for that reason.
  /** "wifi" | "cellular" | "ethernet" | "vpn" | "unknown" by convention (not enforced).
   * Best-effort, Chromium-only in a browser (Network Information API). */
  connectionType?: string;
  devicePixelRatio?: number;
  /** navigator.hardwareConcurrency — logical CPU cores, standard in every modern browser. */
  cpuCores?: number;
  /** From navigator.deviceMemory (GB, rounded down) — Chromium-only, undefined elsewhere. */
  totalMemoryMb?: number;
  /** Native/React Native only — not populated by the browser fingerprint path. */
  manufacturer?: string;
  /** Native/React Native only — not populated by the browser fingerprint path. */
  totalStorageMb?: number;
  /** Native/React Native only — not populated by the browser fingerprint path. */
  freeStorageMb?: number;
  /** 0-100. Native/React Native only — not populated by the browser fingerprint path. */
  batteryLevel?: number;
  /** Native/React Native only — not populated by the browser fingerprint path. */
  isCharging?: boolean;
  /** Native/React Native only — not populated by the browser fingerprint path. */
  isVpnActive?: boolean;
}

/** Score buckets: ≥50 BLOCK, ≥35 HARD_CHALLENGE, ≥15 SOFT_CHALLENGE, otherwise ALLOW. */
export type DeviceAction = 'ALLOW' | 'SOFT_CHALLENGE' | 'HARD_CHALLENGE' | 'BLOCK';

export interface IdentifyInput {
  /** Your own customer identifier — omit only for a signal you can't yet attach to a known customer. */
  externalCustomerId?: string;
  /** You already have this (it's your customer's account identifier) — the SDK never reads it off the device. */
  phoneNumber?: string;
  /** Override the auto-computed fingerprint — mainly useful outside the browser (Node.js, React Native)
   * where there's no DOM to fingerprint; supply your own stable per-device identifier if you have one. */
  visitorId?: string;
  /** Extra attributes merged on top of whatever the SDK could determine automatically. */
  deviceAttributes?: DeviceAttributes;
  /** Idempotency key for this event — defaults to a fresh random UUID. Unique globally, so make
   * your own ids collision-proof (a UUID is safest). A duplicate is not an error: the original
   * event is kept, but the response is still freshly scored. */
  eventId?: string;
}

export interface IdentifyResult {
  recorded: boolean;
  action: DeviceAction;
  riskScore: number;
  /** The fingerprint the SDK computed (or the one you passed in via `visitorId`) — save it if you want to correlate later. */
  visitorId: string;
}

// ─── Transactions ────────────────────────────────────────────────────────────────────────────────

export type TransactionDirection = 'DEBIT' | 'CREDIT';

/** Transaction decision. */
export type TransactionDecision = 'CLEAR' | 'REVIEW' | 'BLOCKED';

/** Mirrors the backend's CustomerSegment enum — exact uppercase values, no transform server-side. */
export type CustomerSegment = 'KYC1' | 'KYC2' | 'AGENT' | 'SUPER_AGENT' | 'MERCHANT' | 'CORPORATE';

/** How the transaction was initiated — lets a Pan Studio rule distinguish e.g. a USSD cash-out
 * from an API-initiated transfer. Omit if not meaningful for your integration. */
export type TransactionChannel = 'branch' | 'atm' | 'pos' | 'online' | 'mobile_app' | 'ussd' | 'agent' | 'api' | 'call_center';

export interface ReportTransactionInput {
  /** Idempotency key — unique per partner (and per live/sandbox). Re-sending one returns 409. */
  externalTransactionId: string;
  externalCustomerId: string;
  /** The customer's display name, as you know it — self-declared, never verified by Protegey
   * (same trust model as `isPep`). Shows up directly in the Pan Studio transactions table. Omit
   * to reuse whatever name you sent on a previous transaction for this customer — once sent,
   * it's remembered and keeps showing on their later transactions too. */
  customerName?: string;
  direction: TransactionDirection;
  /** Positive; stored with 2 decimals. */
  amount: number;
  /** Defaults to XOF server-side. */
  currency?: string;
  /** Free text, e.g. "transfer", "cashout". */
  transactionType: string;
  counterpartyExternalId?: string;
  /** How this transaction was initiated — see TransactionChannel. */
  channel?: TransactionChannel;
  /** SWIFT/BIC or a local bank/MNO code for the counterparty's institution — bank-wire and
   * cross-institution mobile-money scenarios. Free-form: no single format fits every network. */
  counterpartyInstitutionCode?: string;
  /** The counterparty's country (ISO 3166-1 recommended, not enforced) — compare against your
   * customer's own `country` in a Pan Studio rule to flag cross-border activity. */
  counterpartyCountry?: string;
  /** Defaults to false. */
  isCash?: boolean;
  /** ISO-8601. Defaults to now (filled in by the SDK). */
  occurredAt?: string;
  segment?: CustomerSegment;
  country?: string;
  isPep?: boolean;
  /** Same device-intelligence fields as `identify()` — pass them here too and Protegey folds
   * the device signal into this transaction's own decision automatically. When `visitorId` is
   * omitted, Protegey auto-matches a device event reported for this customer in the last ~15 min. */
  visitorId?: string;
  deviceAttributes?: DeviceAttributes;
  devicePhoneNumber?: string;
  /** When this customer's login password was last changed, if you track it — lets a Pan Studio
   * rule flag a large transaction shortly after a credential change (a classic account-takeover
   * pattern). Omit if unknown; the corresponding rule field then simply never fires — Protegey
   * never guesses this. ISO 8601. */
  lastPasswordChangeAt?: string;
  /** Same idea as `lastPasswordChangeAt`, for the account's registered email address. */
  lastEmailChangeAt?: string;
  /** Same idea as `lastPasswordChangeAt`, for the account's registered phone number — also
   * covers a SIM swap for telcos, which is the same signal from your point of view. */
  lastPhoneChangeAt?: string;
  /** The account's balance immediately before this transaction, if you track it — lets a Pan
   * Studio rule flag a withdrawal/transfer that drains most of the balance (a classic mule-
   * account/account-drain signal). Only meaningful for a DEBIT. Omit if unknown. */
  accountBalanceBefore?: number;
}

export interface ReportTransactionResult {
  transactionId: string;
  decision: TransactionDecision;
  riskScore: number;
  deviceAction: DeviceAction | null;
  /** Alerts raised by this transaction. When no rule fired but the device signal was BLOCK or
   * HARD_CHALLENGE, a single device-signal alert (ruleCode `DEVICE-SIGNAL-001`) is returned
   * instead — that one also carries the AlertWithContext fields. */
  alerts: Array<Alert | AlertWithContext>;
}

export interface ListTransactionsQuery extends PaginationQuery {
  direction?: TransactionDirection;
  decision?: TransactionDecision;
  /** Exact match. */
  externalCustomerId?: string;
  /** ISO-8601, compared against `occurredAt`. */
  dateFrom?: string;
  /** ISO-8601, compared against `occurredAt`. */
  dateTo?: string;
}

/** One row of `transactions.list()`, newest `occurredAt` first. */
export interface TransactionSummary {
  transactionId: string;
  externalTransactionId: string;
  externalCustomerId: string;
  direction: TransactionDirection;
  /** Decimal string, e.g. "15000.00" — NOT a number. */
  amount: string;
  currency: string;
  decision: TransactionDecision;
  riskScore: number;
  deviceAction: DeviceAction | null;
  occurredAt: string;
  createdAt: string;
}

export interface TransactionAlertSummary {
  id: string;
  alertNumber: number;
  ruleCode: string;
  status: AlertStatus;
  decisionVerdict: AlertDecisionVerdict | null;
  triggeredAt: string;
}

/** `transactions.get()` — carries no amount/currency/direction. */
export interface TransactionDetail {
  transactionId: string;
  externalTransactionId: string;
  externalCustomerId: string;
  decision: TransactionDecision;
  riskScore: number;
  deviceAction: DeviceAction | null;
  occurredAt: string;
  createdAt: string;
  /** At most 50. */
  alerts: TransactionAlertSummary[];
}

// ─── Cash deposits ───────────────────────────────────────────────────────────────────────────────

/** `channel` as returned on a cash deposit — always UPPERCASE in responses. */
export type CashDepositChannel = Uppercase<TransactionChannel>;

/** Body of POST /partner-api/cash-deposits. A cash deposit is stored as a monitored CREDIT
 * transaction (cash, transactionType "cash_deposit"), so it runs through the same rules, raises
 * the same alerts and counts against the same sandbox quota (100/day) as `transactions.report()`. */
export interface RecordCashDepositInput {
  /** Your own reference — makes the call idempotent (re-sending one returns 409). Generated by
   * Protegey (`cd_<uuid>`) when omitted; send yours so retries are safe. Max 255. */
  externalTransactionId?: string;
  externalCustomerId: string;
  /** Account holder's display name, as you know it — same semantics as on transactions. */
  customerName?: string;
  /** Positive. */
  amount: number;
  /** ISO 4217 (required). */
  currency: string;
  /** ISO-8601 — when the cash was handed over. Defaults to the time of the call (server-side). */
  depositedAt?: string;
  /** Any casing is accepted ("BRANCH" or "branch"). */
  channel?: CashDepositChannel | TransactionChannel;
  /** Max 255. */
  branchId?: string;
  /** Max 255. */
  agentId?: string;
  /** Free text, max 255 — e.g. "Dakar, Plateau". */
  location?: string;
  /** Who physically brought the cash, when different from the account holder. Max 255. */
  depositorName?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordCashDepositResult {
  cashDepositId: string;
  /** Yours, or the one Protegey generated. */
  externalTransactionId: string;
  decision: TransactionDecision;
  riskScore: number;
  alerts: TransactionAlertSummary[];
}

export interface ListCashDepositsQuery extends PaginationQuery {
  /** ISO-8601, compared against `depositedAt`. */
  dateFrom?: string;
  /** ISO-8601, compared against `depositedAt`. */
  dateTo?: string;
  /** Exact match. */
  externalCustomerId?: string;
  minAmount?: number;
  maxAmount?: number;
  /** ISO 4217, any casing. */
  currency?: string;
  /** Any casing. */
  channel?: CashDepositChannel | TransactionChannel;
  /** Any casing. */
  decision?: TransactionDecision;
  /** Exact match. */
  branchId?: string;
  /** Exact match. */
  agentId?: string;
}

/** One row of `cashDeposits.list()`, newest `depositedAt` first. */
export interface CashDeposit {
  cashDepositId: string;
  externalTransactionId: string;
  externalCustomerId: string;
  customerName: string | null;
  /** Decimal string, e.g. "2500000.00" — NOT a number. */
  amount: string;
  currency: string;
  channel: CashDepositChannel | null;
  branchId: string | null;
  agentId: string | null;
  location: string | null;
  depositorName: string | null;
  metadata: Record<string, unknown> | null;
  decision: TransactionDecision;
  riskScore: number;
  depositedAt: string;
  createdAt: string;
}

/** `cashDeposits.get()` — the deposit plus the alerts it raised (at most 50). */
export interface CashDepositDetail extends CashDeposit {
  alerts: TransactionAlertSummary[];
}

// ─── Alerts ──────────────────────────────────────────────────────────────────────────────────────

export type AlertStatus = 'OPEN' | 'CONFIRMED' | 'MORE_INFO_REQUESTED' | 'DISMISSED';

export type AlertDisposition = 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'NO_ACTION' | 'SAR_FILED' | 'ESCALATED';

export type AlertDecisionVerdict = 'BLOCK' | 'STEP_UP' | 'ESCALATE' | 'ALERT';

/** Stays lowercase on the wire. */
export type RuleSeverity = 'review' | 'block' | 'step_up' | 'escalate';

/** The raw alert record. */
export interface Alert {
  id: string;
  partnerId: string;
  isSandbox: boolean;
  ruleId: string;
  alertNumber: number;
  ruleCode: string;
  externalCustomerId: string;
  transactionId: string | null;
  triggeredAt: string;
  /** What the rule matched on — free-form, varies per rule. */
  matchedValues: Record<string, unknown>;
  status: AlertStatus;
  decisionVerdict: AlertDecisionVerdict | null;
  assignedToUserId: string | null;
  disposition: AlertDisposition | null;
  investigationNotes: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
}

/** The transaction snapshot attached to an alert. */
export interface AlertTransactionSnapshot {
  /** Decimal string, e.g. "15000.00". */
  amount: string;
  currency: string;
  direction: TransactionDirection;
  transactionType: string;
  occurredAt: string;
}

/** An alert enriched with its rule's metadata and the triggering transaction — what every
 * `alerts.*` method returns. */
export interface AlertWithContext extends Alert {
  ruleName: string;
  ruleNameFr: string | null;
  ruleExplanation: string | null;
  ruleExplanationFr: string | null;
  ruleSeverity: RuleSeverity;
  ruleNumber: number;
  /** Null when the alert isn't tied to a transaction. */
  transaction: AlertTransactionSnapshot | null;
}

export interface ListAlertsQuery extends PaginationQuery {
  /** Pass the UPPERCASE value — the SDK sends it in the lowercase form this filter requires. */
  status?: AlertStatus;
  /** Pass the UPPERCASE value — the SDK sends it in the lowercase form this filter requires. */
  disposition?: AlertDisposition;
  alertNumber?: number;
  ruleCode?: string;
  externalCustomerId?: string;
  transactionId?: string;
  /** ISO-8601, compared against `triggeredAt`. */
  dateFrom?: string;
  /** ISO-8601, compared against `triggeredAt`. */
  dateTo?: string;
}

export interface UpdateAlertInput {
  status?: AlertStatus;
  /** Must be a user of your organisation (404 otherwise); null unassigns. */
  assignedToUserId?: string | null;
  /** ESCALATED / CONFIRMED_FRAUD on a live alert open an EDD review. */
  disposition?: AlertDisposition | null;
  investigationNotes?: string | null;
  /** ISO-8601, or null to clear. */
  dueAt?: string | null;
}

export type CaseStatus = 'OPEN' | 'INVESTIGATING' | 'CLOSED';
export type CaseOutcome = 'NO_ACTION' | 'FALSE_POSITIVE' | 'SAR_FILED';
/** Stays lowercase on the wire. */
export type CasePriority = 'critical' | 'high' | 'medium' | 'low';

export interface Case {
  id: string;
  partnerId: string;
  isSandbox: boolean;
  externalCustomerId: string;
  title: string;
  caseNumber: number;
  status: CaseStatus;
  priority: CasePriority;
  assignedToUserId: string | null;
  linkedAlertIds: string[];
  outcome: CaseOutcome | null;
  closedByUserId: string | null;
  closedAt: string | null;
  createdByUserId: string | null;
  escalatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConvertAlertToCaseResult {
  /** The alert, now with disposition ESCALATED. */
  alert: AlertWithContext;
  case: Case;
}

// ─── KYC ─────────────────────────────────────────────────────────────────────────────────────────

/** KYC session status. A Protegey identity verification session is IN_PROGRESS at creation, then APPROVED / IN_REVIEW /
 * DECLINED, and RESUBMITTED after a resend. */
export type KycStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'AWAITING_USER'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DECLINED'
  | 'RESUBMITTED'
  | 'ABANDONED'
  | 'EXPIRED'
  | 'KYC_EXPIRED';

/** 'SUCCESS' = confident match, auto-approved. 'MANUAL' = the hard checks (liveness, ID
 * scan) passed but the match confidence was below the configurable auto-approve threshold — a
 * human needs to review it; reported as session status 'IN_REVIEW'. 'FAILED' = a hard check itself
 * failed; reported as session status 'DECLINED'. `null` before a verification result has come back. */
export type KycOutcome = 'SUCCESS' | 'MANUAL' | 'FAILED' | null;

/** Protegey's own verdict on a session (APPROVE / REVIEW / REJECT). Set by the automated result
 * and never changed by a manual override — `status` is the final decision, `recommendation` what
 * Protegey advised. `null` until a first result exists. */
export type KycRecommendation = 'APPROVE' | 'REVIEW' | 'REJECT' | null;

/** A pre-signed, time-limited download link for one KYC photo. */
export interface KycPresignedImage {
  /** Pre-signed S3 URL — no auth header needed. */
  url: string;
  /** ISO-8601 — about 1 hour after the API call. */
  expiresAt: string;
}

/** Pre-signed links to a session's photos. Each is `null` when that photo doesn't exist (not yet
 * captured, no back side for this document type, or the session was anonymized).
 *
 * The URLs are valid for ONE HOUR and are re-issued on every GET: download (or display) the image
 * within the hour, and if you need it later, fetch the session again for fresh links — never
 * store the URL itself. */
export interface KycSessionImages {
  documentFront: KycPresignedImage | null;
  documentBack: KycPresignedImage | null;
  selfie: KycPresignedImage | null;
  documentFaceCrop: KycPresignedImage | null;
}

export interface StartKycSessionInput {
  /** Your own identifier for the end user going through verification (max 255). */
  externalUserId: string;
  /** Optional — feeds Protegey's cross-partner identity-resolution matching alongside `externalUserId`. */
  email?: string;
  /** Optional — same purpose as `email`, for cross-partner identity-resolution matching. */
  phone?: string;
}

/** Returned by `kyc.startSession()` and `kyc.resendSession()`. */
export interface StartKycSessionResult {
  sessionId: string;
  /** Hosted verification link — send it to your user however you like (SMS, email, in-app).
   * Single-use, valid for 30 minutes. */
  url: string;
}

export interface ListKycSessionsQuery extends PaginationQuery {
  /** Pass the UPPERCASE value — the SDK sends it in its canonical Title Case form ("In Review"). */
  status?: KycStatus;
  /** Case-insensitive partial search on full name or externalUserId. */
  search?: string;
  /** Exact (case-sensitive) match on your own customer id — unlike `search`, never partial. */
  externalUserId?: string;
}

/** One row of `kyc.listSessions()` — photos only as pre-signed `images` links (no base64). */
export interface KycSessionSummary {
  sessionId: string;
  externalUserId: string | null;
  status: KycStatus;
  outcome: KycOutcome;
  recommendation: KycRecommendation;
  fullName: string | null;
  documentType: string | null;
  country: string | null;
  createdAt: string;
  /** Valid 1 hour, re-issued on every call — see KycSessionImages. */
  images: KycSessionImages;
}

/** Recorded on the decision when a status is overridden (`kyc.updateSession()` or the portal). */
export interface KycManualReview {
  /** "Partner API" for an override made through the API, otherwise the reviewer's name. */
  reviewedBy: string;
  reviewedAt: string;
  /** UPPER_SNAKE_CASE, e.g. "IN_REVIEW". */
  previousStatus: KycStatus;
  /** UPPER_SNAKE_CASE, e.g. "APPROVED". */
  newStatus: KycReviewStatus;
  note: string | null;
}

/** The verification decision blob — same shape in `getSession()` and the `kyc.status_changed`
 * webhook. */
export interface KycDecision {
  /** Identifies the verification engine that produced the result (an opaque string — don't
   * branch on its value). */
  source: string;
  outcome: KycOutcome;
  passed: boolean;
  /** 0–1. */
  confidenceScore: number;
  /** 0–100. */
  livenessScore: number;
  /** 0–100, null when the flow has no face match. */
  matchScore: number | null;
  matchLevel: number | null;
  /** livenessProven, matchLevel, ageGroup, idScanStatusEnum, spoofStatusEnum, platform, deviceModel. */
  riskFactors: Record<string, unknown>;
  /** Every other OCR'd document field (dateOfBirth, sex, placeOfBirth, …) — varies by document. */
  documentFields: Record<string, string>;
  /** Document authenticity/quality checks (MRZ/NFC/barcode status, …). */
  idScanChecks: Record<string, unknown> | null;
  /** Verbatim verification-engine response (note: any status/outcome/action keys inside it are uppercased too). */
  rawResponse: Record<string, unknown>;
  /** Sanctions/PEP matches on the verified name — absent when screening didn't run. */
  sanctionsMatches?: SanctionsMatch[];
  /** Present once a status was overridden via `kyc.updateSession()`. */
  manualReview?: KycManualReview;
}

/** Response shape of GET /partner-api/kyc/sessions/:sessionId. Richer than the
 * `kyc.status_changed` webhook payload — use it to poll a session's current status. */
export interface KycSessionStatus {
  sessionId: string;
  externalUserId: string | null;
  status: KycStatus;
  /** Typed convenience mirror of decision.outcome — see KycOutcome. */
  outcome: KycOutcome;
  /** Protegey's own verdict, unchanged by a manual override — see KycRecommendation. */
  recommendation: KycRecommendation;
  /** Null before a result exists. */
  decision: KycDecision | null;
  fullName: string | null;
  documentType: string | null;
  country: string | null;
  /** Protegey liveness confidence. */
  livenessScore: number | null;
  /** Protegey selfie-to-document face-match confidence. */
  faceMatchScore: number | null;
  /** Pre-signed links to the photos — valid 1 hour, re-issued on every GET (download within the
   * hour; call `getSession()` again for fresh links). Preferred over the base64 fields below,
   * which are kept for backward compatibility. */
  images: KycSessionImages;
  /** Base64 (no data: prefix), or null if not (yet) captured — photos can arrive ~2–3 min after the decision. */
  documentPhoto: string | null;
  /** Base64 — only populated for a document type whose back side is scanned. */
  documentBackPhoto: string | null;
  /** Base64, or null if not (yet) captured. */
  selfiePhoto: string | null;
  /** Base64 — the face crop matched against `selfiePhoto`. */
  documentFaceCrop: string | null;
}

/** Status overrides a partner may set manually. */
export type KycReviewStatus = 'APPROVED' | 'DECLINED' | 'IN_REVIEW';

/** Every field optional — corrects identity data and/or overrides the status. */
export interface UpdateKycSessionInput {
  fullName?: string;
  externalUserId?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  documentType?: string;
  idDocumentNumber?: string;
  sex?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  profession?: string;
  dateOfIssue?: string;
  dateOfExpiration?: string;
  /** Recorded in decision.manualReview; decision.outcome and `recommendation` are preserved.
   * A change of status fires the `kyc.status_changed` webhook. */
  status?: KycReviewStatus;
  /** Max 1000 chars — stored as decision.manualReview.note. */
  reviewNote?: string;
}

export interface UpdateKycSessionResult {
  sessionId: string;
  externalUserId: string | null;
  status: KycStatus;
  outcome: KycOutcome;
  recommendation: KycRecommendation;
  decision: KycDecision | null;
}

// ─── KYB ─────────────────────────────────────────────────────────────────────────────────────────

export type KybApplicantStatus = 'INVITED' | 'PENDING_REVIEW' | 'MORE_INFO_REQUIRED' | 'ACTIVE' | 'REJECTED';

export type KybSubmissionStatus = 'PENDING' | 'SUBMITTED' | 'MORE_INFO_REQUIRED' | 'APPROVED' | 'REJECTED';

/** `invited` = no response yet; `responded` = any status other than INVITED. */
export type KybApplicantStage = 'invited' | 'responded';

export interface KybOwner {
  name: string;
  taxpayerNumber?: string | null;
  dateOfBirthOrIncorporation?: string | null;
  address?: string | null;
  ownershipPercent?: number | null;
  nonEuEntityOrCitizen?: boolean | null;
}

export interface KybGeneralInfo {
  legalName?: string | null;
  tradingName?: string | null;
  /** ISO 3166-1 alpha-2. */
  country?: string | null;
  tradingAddress?: string | null;
  mailingAddress?: string | null;
  legalStatus?: string | null;
  incorporationDate?: string | null;
  registrationNumber?: string | null;
  website?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  owners?: KybOwner[];
}

export interface KybBusinessDescription {
  yearsInOperation?: string | null;
  countriesOfOperation?: string | null;
  hasShellBankRelationships?: boolean | null;
  shellBankDetails?: string | null;
  primaryBusinessFocus?: string | null;
  mainRevenueActivity?: string | null;
  estimatedMonthlyTransactionCount?: string | null;
  estimatedMonthlyTransactionValue?: string | null;
}

export interface KybPaymentServices {
  yearsProvidingPaymentServices?: string | null;
  focusType?: 'primary' | 'convenience' | 'supplement' | null;
  servicesOffered?: string[];
  otherServiceDetails?: string | null;
  usesAgents?: boolean | null;
  totalAgents?: number | null;
  agentsOutsideCountryDetails?: string | null;
  isAffiliateOfOtherFi?: boolean | null;
  affiliateType?: string | null;
  affiliateName?: string | null;
  affiliateLicensingCountry?: string | null;
}

export interface KybYesNoAnswer {
  answer: boolean;
  details?: string | null;
}

export interface KybDisclosures {
  licenseDeniedSuspendedRevoked?: KybYesNoAnswer | null;
  bankruptcy?: KybYesNoAnswer | null;
  criminalConviction?: KybYesNoAnswer | null;
  amlCivilOrCriminalProceedings?: KybYesNoAnswer | null;
}

/** Sanctions/PEP screening of one name (the business, or one owner). */
export interface KybScreeningEntry {
  decision: SanctionsDecision;
  score: number;
  matches: SanctionsMatch[];
  pepMatch?: boolean;
  provider?: ScreeningProvider;
  providers?: ScreeningProvider[];
  defaultListChecked?: boolean;
  degraded?: boolean;
  fallbackReason?: string;
}

export interface KybOwnerScreeningEntry extends KybScreeningEntry {
  ownerName: string;
  ownershipPercent: number | null;
}

/** One identifier checked against the shared fraud signal network at submit time. */
export interface KybNetworkFlag {
  label: string;
  flagged: boolean;
  matchCount: number;
  flagConfidence: number | null;
}

/** Returned by `kyb.screenApplicant()`, and stored as `submission.screeningResult`. */
export interface KybScreeningResult {
  business: KybScreeningEntry;
  owners: KybOwnerScreeningEntry[];
  screenedAt: string;
  provider?: ScreeningProvider;
  providers?: ScreeningProvider[];
  defaultListChecked?: boolean;
  degraded?: boolean;
  /** Only when degraded. */
  fallbackReason?: string;
  /** Only on the snapshot stored at submit time — never returned by `screenApplicant()`. */
  networkFlags?: KybNetworkFlag[];
}

/** The applicant's questionnaire. Either the four fixed sections (generalInfo, businessDescription,
 * paymentServices, disclosures) are filled, or — for a custom form template — `answers` together
 * with `templateSchemaSnapshot`. */
export interface KybSubmission {
  id: string;
  clientBusinessId: string;
  status: KybSubmissionStatus;
  /** When the current invitation link expires. */
  expiresAt: string;
  /** Last language the applicant used — a prefill hint only. */
  language: string | null;
  generalInfo: KybGeneralInfo | null;
  businessDescription: KybBusinessDescription | null;
  paymentServices: KybPaymentServices | null;
  disclosures: KybDisclosures | null;
  templateId: string | null;
  /** The form template schema as it was at invite time (custom templates only). */
  templateSchemaSnapshot: Record<string, unknown> | null;
  /** Lowercase. */
  templateLayout: 'steps' | 'single_page' | null;
  /** Answers keyed by field id (custom templates only). */
  answers: Record<string, unknown> | null;
  documentFileName: string | null;
  documentMimeType: string | null;
  documentFileSizeBytes: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  moreInfoNote: string | null;
  rejectionReason: string | null;
  screenedAt: string | null;
  screeningResult: KybScreeningResult | null;
  ownerTaxIds: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** A business you invited through KYB, without its submission. */
export interface KybApplicantRecord {
  id: string;
  partnerId: string;
  legalName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string;
  status: KybApplicantStatus;
  activatedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `kyb.listApplicants()` rows and `kyb.getApplicant()`. */
export interface KybApplicant extends KybApplicantRecord {
  /** Null when no application is on file (list only — `getApplicant()` returns 404 instead). */
  submission: KybSubmission | null;
}

export interface ListKybApplicantsQuery extends PaginationQuery {
  /** Searches legal name, contact name, contact email, id and every questionnaire answer. */
  search?: string;
  status?: KybApplicantStatus;
  stage?: KybApplicantStage;
}

interface InviteKybApplicantBase {
  contactName: string;
  /** Your KYB form template id; omit to use the default form. */
  templateId?: string;
}

/** At least one of `contactEmail` / `contactPhone` is required. An invitation email is sent only
 * when `contactEmail` is set — otherwise deliver the returned `applicationUrl` yourself (SMS,
 * WhatsApp, …). */
export type InviteKybApplicantInput =
  | (InviteKybApplicantBase & { contactEmail: string; contactPhone?: string })
  | (InviteKybApplicantBase & { contactEmail?: string; contactPhone: string });

export interface InviteKybApplicantResult extends KybApplicantRecord {
  /** The applicant's questionnaire link — share it however you like. */
  applicationUrl: string;
}

/** `kyb.resendInvitation()` returns the rotated submission (not the business). */
export interface ResendKybInvitationResult extends KybSubmission {
  applicationUrl: string;
}

export type KybDecision = 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';

export type DecideKybApplicantInput =
  | { decision: 'APPROVE' }
  /** `reason`: min 5 chars. */
  | { decision: 'REJECT'; reason: string }
  /** `note`: min 5 chars, shown to the applicant. */
  | { decision: 'REQUEST_MORE_INFO'; note: string };

export interface DecideKybApplicantResult extends KybApplicantRecord {
  /** Only present for REQUEST_MORE_INFO — the fresh link to send back to the applicant. */
  applicationUrl?: string;
}

// ─── Sanctions screening ─────────────────────────────────────────────────────────────────────────

export type SanctionsDecision = 'BLOCKED' | 'REVIEW' | 'CLEAR';

/** Lowercase on the wire, both in requests and responses. */
export type SanctionsEntityType = 'person' | 'business';

export type ScreeningProvider = 'protegey' | 'dow_jones';

/** Lowercase. */
export type SanctionsSource = 'nigsac' | 'ofac' | 'eu' | 'un' | 'au' | 'dfat' | 'custom' | 'dow_jones';

export interface SanctionsMatch {
  id: string;
  name: string;
  /** 'person' | 'business' for the Protegey list; 'pep' | 'sanction' for Dow Jones. */
  type: SanctionsEntityType | 'pep' | 'sanction';
  source: SanctionsSource;
  sourceId: string | null;
  aliases: string[];
  dateOfBirth: string | null;
  nationality: string | null;
  listingDate: string | null;
  notes: string | null;
  score: number;
  matchedOn: 'name' | 'alias';
  isPep: boolean;
}

export interface ScreenNameInput {
  name: string;
  type?: SanctionsEntityType;
}

export interface SanctionsScreeningResult {
  /** BLOCKED: a non-PEP match ≥ 0.85; REVIEW: any match ≥ 0.5; otherwise CLEAR. */
  decision: SanctionsDecision;
  score: number;
  /** Only matches scoring ≥ 0.5. */
  matches: SanctionsMatch[];
  pepMatch: boolean;
  provider?: ScreeningProvider;
  providers?: ScreeningProvider[];
  defaultListChecked?: boolean;
  /** True when an external provider failed and the result fell back. */
  degraded?: boolean;
  fallbackReason?: string;
}

// ─── Shared fraud signal network ─────────────────────────────────────────────────────────────────

export type SharedSignalCategory = 'CONFIRMED_FRAUD' | 'IDENTITY_THEFT' | 'MONEY_LAUNDERING' | 'OTHER';

/** Provide at least one identifier. */
export interface CheckSharedSignalInput {
  phoneNumber?: string;
  email?: string;
  /** A device `visitorId`. */
  deviceFingerprint?: string;
  governmentId?: string;
  /** Protegey's cross-partner identity UID. */
  personIdentityId?: string;
  /** When set and a match is found, your own risk profile for this customer is raised. */
  externalCustomerId?: string;
}

export interface SharedSignalMatch {
  category: SharedSignalCategory;
  reportedDaysAgo: number;
}

export interface CheckSharedSignalResult {
  flagged: boolean;
  /** Most recent match's category; null when not flagged. */
  category: SharedSignalCategory | null;
  /** Null when not flagged. */
  reportedDaysAgo: number | null;
  /** 0–100; null when not flagged. */
  flagConfidence: number | null;
  matchCount: number;
  /** Newest first; retracted reports excluded. The reporting partner is never disclosed. */
  matches: SharedSignalMatch[];
}

// ─── Behavioral biometrics ───────────────────────────────────────────────────────────────────────

/** Aggregated timing/gesture metadata only — never raw keystrokes/content. All fields optional:
 * send whatever your app captured for this session. Mirrors the backend's KeystrokeMetricsDto. */
export interface KeystrokeMetrics {
  avgHoldTimeMs?: number;
  avgInterKeyLatencyMs?: number;
  typingSpeedCharsPerSec?: number;
  errorRate?: number;
}

export interface TouchMetrics {
  avgTapPressure?: number;
  avgSwipeVelocity?: number;
  scrollBehaviorScore?: number;
  mouseAcceleration?: number;
}

export interface NavigationMetrics {
  /** Ordered screen/action identifiers for this session's task, e.g. ["login","dashboard","transfer","confirm"]. */
  screenSequence?: string[];
}

export interface SessionMetrics {
  /** Integer 0–23. */
  loginHourBucket?: number;
  /** Integer 0–6. */
  loginDayOfWeek?: number;
  sessionDurationMs?: number;
}

export interface ReportBehavioralEventInput {
  externalCustomerId: string;
  /** Groups the metrics you send across one task/session — reuse the same id across calls for the same session. */
  sessionId: string;
  keystroke?: KeystrokeMetrics;
  touch?: TouchMetrics;
  navigation?: NavigationMetrics;
  session?: SessionMetrics;
}

export type BehavioralConfidenceTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ReportBehavioralEventResult {
  /** "LEARNING": not enough history for this customer yet — score 0, keep sending sessions. */
  status: 'LEARNING' | 'SCORED';
  deviationScore: number;
  confidenceTier: BehavioralConfidenceTier | null;
  stepUpRecommended: boolean;
  /** Set when a HIGH deviation combined with another risk signal raised a `BEHAV-ATO-001` alert. */
  escalatedAlertId: string | null;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────────────────────────

export interface KycStatusChangedEvent {
  type: 'kyc.status_changed';
  eventId: string;
  externalUserId: string | null;
  status: 'APPROVED' | 'IN_REVIEW' | 'DECLINED';
  /** Protegey's own verdict — differs from `status` when a reviewer overrode it. */
  recommendation: KycRecommendation;
  /** The same `sessionId` `startSession()` returned — pass it to `kyc.getSession()`. */
  sessionId: string;
  decision: KycDecision | null;
}

export interface KybStatusChangedEvent {
  type: 'kyb.status_changed';
  eventId: string;
  clientId: string;
  status: 'ACTIVE' | 'REJECTED' | 'MORE_INFO_REQUIRED';
  submissionStatus: 'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED';
  decision: KybDecision;
}

export interface AlertCreatedEvent {
  type: 'alert.created';
  eventId: string;
  alertId: string;
  ruleCode: string;
  externalCustomerId: string;
  transactionId: string | null;
  status: AlertStatus;
  triggeredAt: string;
}

/** Fires on every alert update (even when only notes/assignment changed) and on convert-to-case. */
export interface AlertStatusChangedEvent {
  type: 'alert.status_changed';
  eventId: string;
  alertId: string;
  ruleCode: string;
  externalCustomerId: string;
  status: AlertStatus;
}

export interface TransactionBlockedEvent {
  type: 'transaction.blocked';
  eventId: string;
  transactionId: string;
  externalTransactionId: string;
  externalCustomerId: string;
  /** A number here (unlike the decimal string in `transactions.list()`). */
  amount: number;
  currency: string;
  riskScore: number;
  /** The rule engine's verdict before the device signal was applied. */
  ruleDecision: TransactionDecision;
  deviceAction: DeviceAction | null;
  alertIds: string[];
  /** Exactly as you sent it. */
  occurredAt: string;
}

export interface WebhookTestEvent {
  type: 'webhook.test';
  eventId: string;
  message: string;
  sentAt: string;
}

/** Every event Protegey delivers to your webhook URL. Deduplicate on `eventId` — retries reuse it. */
export type WebhookEvent =
  | KycStatusChangedEvent
  | KybStatusChangedEvent
  | AlertCreatedEvent
  | AlertStatusChangedEvent
  | TransactionBlockedEvent
  | WebhookTestEvent;

export type WebhookEventType = WebhookEvent['type'];

// ─── Client options ──────────────────────────────────────────────────────────────────────────────

export interface ProtegeyOptions {
  /** Your partner API key (live or sandbox — the key itself selects the mode) — sent as the
   * `x-api-key` header on every request. */
  apiKey: string;
  /** Your Protegey API environment, e.g. "https://api.protegey.com". No default on purpose — see
   * ProtegeyHttpClient's doc comment for why. Confirm the current value with Protegey before
   * shipping to production; it can change independently of this package's version. */
  baseUrl: string;
}
