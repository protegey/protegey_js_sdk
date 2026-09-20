/** Mirrors the backend's DeviceAttributesDto — a closed, all-optional list. Keep in sync with
 * protegey-backend/src/keverd/dto/device-attributes.dto.ts. */
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
}

export type DeviceAction = 'allow' | 'soft_challenge' | 'hard_challenge' | 'block';

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

export interface ReportTransactionInput {
  externalTransactionId: string;
  externalCustomerId: string;
  direction: TransactionDirection;
  amount: number;
  currency?: string;
  transactionType: string;
  counterpartyExternalId?: string;
  isCash?: boolean;
  /** Defaults to now. */
  occurredAt?: string;
  segment?: string;
  country?: string;
  isPep?: boolean;
  /** Same device-intelligence fields as `identify()` — pass them here too and Protegey folds
   * the device signal into this transaction's own decision automatically. */
  visitorId?: string;
  deviceAttributes?: DeviceAttributes;
  devicePhoneNumber?: string;
}

export interface Alert {
  id: string;
  ruleCode: string;
  status: string;
  [key: string]: unknown;
}

export interface ReportTransactionResult {
  transactionId: string;
  decision: 'clear' | 'review' | 'blocked';
  riskScore: number;
  alerts: Alert[];
  deviceAction: DeviceAction | null;
}

export interface StartKycSessionInput {
  /** Your own identifier for the end user going through verification. */
  externalUserId: string;
}

export interface StartKycSessionResult {
  sessionId: string;
  /** Hosted verification link — send it to your user however you like (SMS, email, in-app). */
  url: string;
}

export interface ProtegeyOptions {
  /** Your partner API key — sent as the `x-api-key` header on every request. */
  apiKey: string;
  /** Your Protegey API environment, e.g. "https://api.protegey.com". No default on purpose — see
   * ProtegeyHttpClient's doc comment for why. Confirm the current value with Protegey before
   * shipping to production; it can change independently of this package's version. */
  baseUrl: string;
}
