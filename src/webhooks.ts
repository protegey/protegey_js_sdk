import type { WebhookEvent } from './types.js';

/** Protegey's webhook signature headers (HTTP header names are case-insensitive). */
export const WEBHOOK_SIGNATURE_HEADER = 'X-Signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'X-Timestamp';

/** Thrown by `constructWebhookEvent()` when a delivery can't be trusted. */
export class ProtegeyWebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtegeyWebhookSignatureError';
  }
}

export interface VerifyWebhookInput {
  /** The request body EXACTLY as received (string or bytes) — not a re-serialized JSON object. */
  rawBody: string | Uint8Array;
  /** Value of the `X-Signature` header (hex HMAC-SHA256). */
  signature: string | null | undefined;
  /** Value of the `X-Timestamp` header (unix seconds). */
  timestamp: string | null | undefined;
  /** Your webhook secret, shown once in the Protegey portal. */
  secret: string;
  /** Max accepted age of the delivery, in seconds — defends against replays. Default 300. Each
   * delivery attempt (including retries) is signed with a fresh timestamp. Pass `Infinity` to
   * disable the check. */
  toleranceSeconds?: number;
  /** Override "now" (unix seconds) — for tests. */
  now?: number;
}

const encoder = new TextEncoder();

interface SubtleLike {
  importKey: SubtleCrypto['importKey'];
  sign: SubtleCrypto['sign'];
}

async function getSubtle(): Promise<SubtleLike> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleLike } }).crypto?.subtle;
  if (subtle) return subtle;
  // Node 18 doesn't expose Web Crypto as a global — load it from node:crypto. The specifier is
  // kept in a variable so browser bundlers don't try to resolve a Node built-in.
  const specifier = 'node:crypto';
  const mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ specifier)) as { webcrypto: { subtle: SubtleLike } };
  return mod.webcrypto.subtle;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const subtle = await getSubtle();
  const key = await subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await subtle.sign('HMAC', key, encoder.encode(message)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bodyToString(rawBody: string | Uint8Array): string {
  return typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
}

async function check(input: VerifyWebhookInput): Promise<string | null> {
  const { signature, timestamp, secret } = input;
  if (!secret) return 'Missing webhook secret';
  if (!signature) return `Missing ${WEBHOOK_SIGNATURE_HEADER} header`;
  if (!timestamp || !/^\d+$/.test(timestamp)) return `Missing or malformed ${WEBHOOK_TIMESTAMP_HEADER} header`;

  const tolerance = input.toleranceSeconds ?? 300;
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > tolerance) return 'Webhook timestamp is outside the tolerance window';

  const expected = await hmacSha256Hex(secret, `${timestamp}.${bodyToString(input.rawBody)}`);
  return timingSafeEqual(expected, signature.trim().toLowerCase()) ? null : 'Webhook signature does not match';
}

/** True when the delivery was signed by Protegey with `secret`:
 * `X-Signature = hex(HMAC_SHA256(secret, "{X-Timestamp}.{rawBody}"))`, and the timestamp is
 * within `toleranceSeconds`. Works in Node.js ≥ 18, Deno, Bun and edge runtimes (Web Crypto). */
export async function verifyWebhookSignature(input: VerifyWebhookInput): Promise<boolean> {
  return (await check(input)) === null;
}

/** Verifies the delivery and parses it into a typed `WebhookEvent` — throws
 * `ProtegeyWebhookSignatureError` if it can't be trusted. Switch on `event.type`, and deduplicate
 * on `event.eventId` (a failed delivery is retried up to 5 times over ~3 hours with the same
 * `eventId`). */
export async function constructWebhookEvent(input: VerifyWebhookInput): Promise<WebhookEvent> {
  const failure = await check(input);
  if (failure) throw new ProtegeyWebhookSignatureError(failure);
  return JSON.parse(bodyToString(input.rawBody)) as WebhookEvent;
}
