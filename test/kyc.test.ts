import { describe, expect, it, vi } from 'vitest';
import { KycModule } from '../src/kyc.js';

function buildHttp(postResponse: unknown = { sessionId: 'sess_1', url: 'https://verify.didit.me/session/1' }, getResponse: unknown = {}) {
  return { post: vi.fn(async () => postResponse), get: vi.fn(async () => getResponse) };
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

describe('KycModule.getSession', () => {
  it('GETs /partner-api/kyc/sessions/:sessionId — the webhook polling fallback', async () => {
    const http = buildHttp(undefined, { sessionId: 'sess_1', externalUserId: 'cust-1', status: 'Approved', decision: null });
    const kyc = new KycModule(http as never);

    const result = await kyc.getSession('sess_1');

    expect(http.get).toHaveBeenCalledWith('/partner-api/kyc/sessions/sess_1');
    expect(result.status).toBe('Approved');
  });

  it('URL-encodes the sessionId', async () => {
    const http = buildHttp(undefined, {});
    const kyc = new KycModule(http as never);

    await kyc.getSession('sess/with slash');

    expect(http.get).toHaveBeenCalledWith('/partner-api/kyc/sessions/sess%2Fwith%20slash');
  });
});
