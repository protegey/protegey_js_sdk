import { describe, expect, it, vi } from 'vitest';
import { KycModule } from '../src/kyc.js';

function buildHttp(response: unknown = { sessionId: 'sess_1', url: 'https://verify.didit.me/session/1' }) {
  return { post: vi.fn(async () => response) };
}

describe('KycModule.startSession', () => {
  it('posts the externalUserId to /partner-api/kyc/sessions', async () => {
    const http = buildHttp();
    const kyc = new KycModule(http as never);

    await kyc.startSession({ externalUserId: 'cust-1' });

    expect(http.post).toHaveBeenCalledWith('/partner-api/kyc/sessions', { externalUserId: 'cust-1' });
  });

  it('returns the sessionId and hosted verification url', async () => {
    const http = buildHttp({ sessionId: 'sess_abc', url: 'https://verify.didit.me/session/abc' });
    const kyc = new KycModule(http as never);

    const result = await kyc.startSession({ externalUserId: 'cust-1' });

    expect(result).toEqual({ sessionId: 'sess_abc', url: 'https://verify.didit.me/session/abc' });
  });
});
