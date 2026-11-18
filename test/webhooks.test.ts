import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { constructWebhookEvent, ProtegeyWebhookSignatureError, verifyWebhookSignature } from '../src/webhooks.js';

const secret = 'whsec-test-secret';
const now = 1_763_460_000;
const timestamp = String(now);
const rawBody = JSON.stringify({
  type: 'alert.created',
  eventId: 'evt-1',
  alertId: 'a1',
  ruleCode: 'VEL-001',
  externalCustomerId: 'cust-1',
  transactionId: null,
  status: 'OPEN',
  triggeredAt: '2026-11-18T10:00:00.000Z',
});

// Exactly how the backend signs: hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`)).
const signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');

describe('verifyWebhookSignature', () => {
  it('accepts a delivery signed the way the backend signs it', async () => {
    expect(await verifyWebhookSignature({ rawBody, signature, timestamp, secret, now })).toBe(true);
  });

  it('accepts a Uint8Array body', async () => {
    expect(await verifyWebhookSignature({ rawBody: new TextEncoder().encode(rawBody), signature, timestamp, secret, now })).toBe(true);
  });

  it('rejects a tampered body', async () => {
    expect(await verifyWebhookSignature({ rawBody: rawBody.replace('OPEN', 'DISMISSED'), signature, timestamp, secret, now })).toBe(false);
  });

  it('rejects the wrong secret', async () => {
    expect(await verifyWebhookSignature({ rawBody, signature, timestamp, secret: 'other', now })).toBe(false);
  });

  it('rejects a signature bound to another timestamp', async () => {
    expect(await verifyWebhookSignature({ rawBody, signature, timestamp: String(now + 1), secret, now })).toBe(false);
  });

  it('rejects a delivery outside the tolerance window, unless disabled', async () => {
    expect(await verifyWebhookSignature({ rawBody, signature, timestamp, secret, now: now + 301 })).toBe(false);
    expect(await verifyWebhookSignature({ rawBody, signature, timestamp, secret, now: now + 301, toleranceSeconds: Infinity })).toBe(true);
  });

  it('rejects missing headers', async () => {
    expect(await verifyWebhookSignature({ rawBody, signature: undefined, timestamp, secret, now })).toBe(false);
    expect(await verifyWebhookSignature({ rawBody, signature, timestamp: null, secret, now })).toBe(false);
  });
});

describe('constructWebhookEvent', () => {
  it('returns the typed event once verified', async () => {
    const event = await constructWebhookEvent({ rawBody, signature, timestamp, secret, now });
    expect(event.type).toBe('alert.created');
    if (event.type === 'alert.created') expect(event.alertId).toBe('a1');
  });

  it('throws ProtegeyWebhookSignatureError on a bad signature', async () => {
    await expect(constructWebhookEvent({ rawBody, signature: 'deadbeef', timestamp, secret, now })).rejects.toBeInstanceOf(
      ProtegeyWebhookSignatureError,
    );
  });
});
