import { afterEach, describe, expect, it, vi } from 'vitest';
import { Protegey, ProtegeyApiError } from '../src/index.js';

const BASE = 'https://api.example.com';

function setup(responseBody: unknown = {}, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(responseBody), { status }));
  vi.stubGlobal('fetch', fetchMock);
  const protegey = new Protegey({ apiKey: 'test-key', baseUrl: BASE });
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as unknown as [string, RequestInit];
    return {
      url,
      method: init.method,
      headers: init.headers as Record<string, string>,
      body: init.body === undefined ? undefined : JSON.parse(init.body as string),
    };
  };
  return { protegey, lastCall };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cashDeposits', () => {
  it('record POSTs the deposit as JSON with the api key', async () => {
    const response = {
      cashDepositId: 'cd-uuid',
      externalTransactionId: 'dep-0001',
      decision: 'REVIEW',
      riskScore: 20,
      alerts: [{ id: 'a1', alertNumber: 1043, ruleCode: 'IND006-KYC1', status: 'OPEN', decisionVerdict: null, triggeredAt: '2026-11-18T09:30:01.204Z' }],
    };
    const { protegey, lastCall } = setup(response);
    const input = {
      externalTransactionId: 'dep-0001',
      externalCustomerId: 'cust-9981',
      amount: 2500000,
      currency: 'XOF',
      channel: 'BRANCH' as const,
      branchId: 'DKR-PLATEAU',
      depositorName: 'Awa Diallo',
      metadata: { tellerId: 'T-04' },
    };
    const result = await protegey.cashDeposits.record(input);

    const call = lastCall();
    expect(call.url).toBe(`${BASE}/partner-api/cash-deposits`);
    expect(call.method).toBe('POST');
    expect(call.headers).toEqual({ 'Content-Type': 'application/json', 'x-api-key': 'test-key' });
    // Sent as-is: depositedAt is defaulted server-side, not by the SDK.
    expect(call.body).toEqual(input);
    expect(result).toEqual(response);
  });

  it('record surfaces a duplicate externalTransactionId as a 409 ProtegeyApiError', async () => {
    const { protegey } = setup({ statusCode: 409, message: 'Transaction already submitted' }, 409);
    const error = await protegey.cashDeposits.record({ externalTransactionId: 'dep-0001', externalCustomerId: 'c', amount: 1, currency: 'XOF' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProtegeyApiError);
    expect((error as ProtegeyApiError).status).toBe(409);
    expect((error as ProtegeyApiError).message).toBe('Transaction already submitted');
  });

  it('list GETs with every filter as a query string', async () => {
    const { protegey, lastCall } = setup({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await protegey.cashDeposits.list({
      page: 2,
      limit: 100,
      dateFrom: '2026-11-01T00:00:00.000Z',
      dateTo: '2026-11-30T23:59:59.999Z',
      externalCustomerId: 'cust-9981',
      minAmount: 1000000,
      maxAmount: 5000000,
      currency: 'XOF',
      channel: 'BRANCH',
      decision: 'REVIEW',
      branchId: 'DKR-PLATEAU',
      agentId: 'AG-7',
    });
    const call = lastCall();
    expect(call.method).toBe('GET');
    expect(call.headers).toEqual({ 'x-api-key': 'test-key' });
    expect(call.body).toBeUndefined();
    const url = new URL(call.url);
    expect(url.origin + url.pathname).toBe(`${BASE}/partner-api/cash-deposits`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      limit: '100',
      dateFrom: '2026-11-01T00:00:00.000Z',
      dateTo: '2026-11-30T23:59:59.999Z',
      externalCustomerId: 'cust-9981',
      minAmount: '1000000',
      maxAmount: '5000000',
      currency: 'XOF',
      channel: 'BRANCH',
      decision: 'REVIEW',
      branchId: 'DKR-PLATEAU',
      agentId: 'AG-7',
    });

    await protegey.cashDeposits.list();
    expect(lastCall().url).toBe(`${BASE}/partner-api/cash-deposits`);
  });

  it('get fetches by Protegey id or URL-encoded external id', async () => {
    const { protegey, lastCall } = setup({ cashDepositId: 'cd-uuid', amount: '2500000.00', alerts: [] });
    const deposit = await protegey.cashDeposits.get('dep/0001');
    expect(lastCall()).toMatchObject({ url: `${BASE}/partner-api/cash-deposits/dep%2F0001`, method: 'GET', headers: { 'x-api-key': 'test-key' } });
    expect(deposit.amount).toBe('2500000.00');
  });
});

describe('kyc: recommendation, images and externalUserId lookup', () => {
  it('listSessions sends the exact externalUserId filter', async () => {
    const { protegey, lastCall } = setup({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await protegey.kyc.listSessions({ externalUserId: 'cust-9981', status: 'APPROVED' });
    expect(lastCall()).toMatchObject({
      url: `${BASE}/partner-api/kyc/sessions?externalUserId=cust-9981&status=Approved`,
      method: 'GET',
      headers: { 'x-api-key': 'test-key' },
    });
  });

  it('getSession returns recommendation and pre-signed images untouched', async () => {
    const images = {
      documentFront: { url: 'https://bucket.s3/front.jpg?X-Amz-Signature=x', expiresAt: '2026-11-19T13:00:00.000Z' },
      documentBack: null,
      selfie: { url: 'https://bucket.s3/selfie.jpg?X-Amz-Signature=y', expiresAt: '2026-11-19T13:00:00.000Z' },
      documentFaceCrop: null,
    };
    const { protegey } = setup({ sessionId: 's1', status: 'IN_REVIEW', recommendation: 'APPROVE', images });
    const session = await protegey.kyc.getSession('s1');
    expect(session.recommendation).toBe('APPROVE');
    expect(session.images).toEqual(images);
  });
});
