import { describe, expect, it } from 'vitest';
import { computeFingerprint } from '../src/fingerprint.js';

describe('computeFingerprint (Node.js environment — no DOM)', () => {
  it('falls back to a random id when there is no window/document to fingerprint', async () => {
    const result = await computeFingerprint();
    expect(result.visitorId).toBeTruthy();
    expect(result.attributes).toEqual({});
  });

  it('produces a different id on each call (documented as non-stable outside the browser)', async () => {
    const first = await computeFingerprint();
    const second = await computeFingerprint();
    expect(first.visitorId).not.toBe(second.visitorId);
  });
});
