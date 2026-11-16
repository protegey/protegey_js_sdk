/** Mirrors the backend's DeviceAttributesDto — a closed, all-optional list. Keep in sync with
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
  /** Best-effort, Chromium-only (Network Information API) — undefined on Safari/Firefox. */
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

/** UPPER_SNAKE_CASE on the wire since the partner-api UPPERCASE rollout (2026-11-14). */
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
  /** Your own idempotency key for this event — defaults to a fresh random id if omitted. */
  eventId?: string;
}

export interface IdentifyResult {
  recorded: boolean;
  action: DeviceAction | null;
  riskScore: number | null;
  /** The fingerprint the SDK computed (or the one you passed in via `visitorId`) — save it if you want to correlate later. */
  visitorId: string;
}

export type TransactionDirection = 'DEBIT' | 'CREDIT';

/** Mirrors the backend's CustomerSegment enum (protegey-backend/src/monitoring/enums/customer-segment.enum.ts). */
export type CustomerSegment = 'KYC1' | 'KYC2' | 'AGENT' | 'SUPER_AGENT' | 'MERCHANT' | 'CORPORATE';

/** How the transaction was initiated — lets a Pan Studio rule distinguish e.g. a USSD cash-out
 * from an API-initiated transfer. Omit if not meaningful for your integration. */
export type TransactionChannel = 'branch' | 'atm' | 'pos' | 'online' | 'mobile_app' | 'ussd' | 'agent' | 'api' | 'call_center';

export interface ReportTransactionInput {
  externalTransactionId: string;
  externalCustomerId: string;
  /** The customer's display name, as you know it — self-declared, never verified by Protegey
   * (same trust model as `isPep`). Shows up directly in the Pan Studio transactions table. Omit
   * to reuse whatever name you sent on a previous transaction for this customer — once sent,
   * it's remembered and keeps showing on their later transactions too. */
  customerName?: string;
  direction: TransactionDirection;
  amount: number;
  currency?: string;
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
  isCash?: boolean;
  /** Defaults to now. */
  occurredAt?: string;
  segment?: CustomerSegment;
  country?: string;
  isPep?: boolean;
  /** Same device-intelligence fields as `identify()` — pass them here too and Protegey folds
   * the device signal into this transaction's own decision automatically. */
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

export interface Alert {
  id: string;
  ruleCode: string;
  status: string;
  [key: string]: unknown;
}

export interface ReportTransactionResult {
  transactionId: string;
  /** UPPER_SNAKE_CASE on the wire since the partner-api UPPERCASE rollout (2026-11-14). */
  decision: 'CLEAR' | 'REVIEW' | 'BLOCKED';
  riskScore: number;
  alerts: Alert[];
  deviceAction: DeviceAction | null;
}

export interface StartKycSessionInput {
  /** Your own identifier for the end user going through verification. */
  externalUserId: string;
  /** Optional — feeds Protegey's cross-partner identity-resolution matching alongside `externalUserId`. */
  email?: string;
  /** Optional — same purpose as `email`, for cross-partner identity-resolution matching. */
  phone?: string;
}

export interface StartKycSessionResult {
  sessionId: string;
  /** Hosted verification link — send it to your user however you like (SMS, email, in-app). */
  url: string;
}

/** 'SUCCESS' = confident match, auto-approved. 'MANUAL' = FaceTec's hard checks (liveness, ID
 * scan) passed but the match confidence was below the configurable auto-approve threshold (80%
 * by default) — a human needs to review it; reported as session status 'IN_REVIEW'. 'FAILED' = a
 * hard check itself failed (liveness never proven, ID scan failed, or no face match at all);
 * reported as session status 'DECLINED'. `null` before a FaceTec result has come back yet. */
export type KycOutcome = 'SUCCESS' | 'MANUAL' | 'FAILED' | null;

/** Response shape of GET /partner-api/kyc/sessions/:sessionId — NOT the same shape as the
 * outbound KYC webhook payload. The webhook (`kyc.status_changed`) only ever sends
 * `{ type, eventId, externalUserId, status, sessionId, decision }` — no top-level `outcome` and
 * none of the identity/biometric fields below. Use this richer GET response to poll a session's
 * current status as a fallback: webhook delivery is best-effort (one retry, no queue), so this is
 * the only way to be certain of a session's status (or to get at these fields at all) if a
 * delivery is ever lost. */
export interface KycSessionStatus {
  sessionId: string;
  externalUserId: string | null;
  status: string;
  /** Typed convenience mirror of decision.outcome — see KycOutcome. */
  outcome: KycOutcome;
  decision: Record<string, unknown> | null;
  fullName: string | null;
  documentType: string | null;
  country: string | null;
  /** FaceTec liveness confidence. */
  livenessScore: number | null;
  /** FaceTec selfie-to-document face-match confidence. */
  faceMatchScore: number | null;
  /** Base64-encoded image, or null if not (yet) captured. */
  documentPhoto: string | null;
  /** Base64-encoded image — only populated for a document type FaceTec scans a back side for. */
  documentBackPhoto: string | null;
  /** Base64-encoded image, or null if not (yet) captured. */
  selfiePhoto: string | null;
  /** Base64-encoded image — the face crop FaceTec matched against `selfiePhoto`. */
  documentFaceCrop: string | null;
}

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
  loginHourBucket?: number;
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

/** UPPER_SNAKE_CASE on the wire since the partner-api UPPERCASE rollout (2026-11-14). */
export type BehavioralConfidenceTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ReportBehavioralEventResult {
  /** "LEARNING": not enough history for this customer yet — no score, keep sending sessions. */
  status: 'LEARNING' | 'SCORED';
  deviationScore: number;
  confidenceTier: BehavioralConfidenceTier | null;
  stepUpRecommended: boolean;
  escalatedAlertId: string | null;
}

export interface ProtegeyOptions {
  /** Your partner API key — sent as the `x-api-key` header on every request. */
  apiKey: string;
  /** Your Protegey API environment, e.g. "https://api.protegey.com". No default on purpose — see
   * ProtegeyHttpClient's doc comment for why. Confirm the current value with Protegey before
   * shipping to production; it can change independently of this package's version. */
  baseUrl: string;
}
