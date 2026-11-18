import { afterEach, describe, expect, it, vi } from 'vitest';
import { Protegey } from '../src/index.js';

const BASE = 'https://api.example.com';

function setup(responseBody: unknown = {}, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(responseBody), { status }));
  vi.stubGlobal('fetch', fetchMock);
  const protegey = new Protegey({ apiKey: 'k', baseUrl: BASE });
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as unknown as [string, RequestInit];
    return { url, method: init.method, body: init.body === undefined ? undefined : JSON.parse(init.body as string) };
  };
  return { protegey, lastCall };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('every partner-api endpoint maps to the right method + path + payload', () => {
  it('kyc.listSessions converts the UPPERCASE status filter to the Title Case value the API requires', async () => {
    const { protegey, lastCall } = setup({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await protegey.kyc.listSessions({ status: 'IN_REVIEW', search: 'jane', page: 2, limit: 50 });
    expect(lastCall()).toEqual({ url: `${BASE}/partner-api/kyc/sessions?search=jane&page=2&limit=50&status=In+Review`, method: 'GET', body: undefined });

    await protegey.kyc.listSessions({ status: 'KYC_EXPIRED' });
    expect(lastCall().url).toBe(`${BASE}/partner-api/kyc/sessions?status=Kyc+Expired`);

    await protegey.kyc.listSessions();
    expect(lastCall().url).toBe(`${BASE}/partner-api/kyc/sessions`);
  });

  it('kyc.updateSession PATCHes the session', async () => {
    const { protegey, lastCall } = setup({ sessionId: 's1', status: 'APPROVED' });
    await protegey.kyc.updateSession('s1', { status: 'APPROVED', reviewNote: 'Checked by hand' });
    expect(lastCall()).toEqual({
      url: `${BASE}/partner-api/kyc/sessions/s1`,
      method: 'PATCH',
      body: { status: 'APPROVED', reviewNote: 'Checked by hand' },
    });
  });

  it('kyc.resendSession POSTs with no body', async () => {
    const { protegey, lastCall } = setup({ sessionId: 's1', url: 'https://capture/x' });
    const result = await protegey.kyc.resendSession('s1');
    expect(lastCall()).toEqual({ url: `${BASE}/partner-api/kyc/sessions/s1/resend`, method: 'POST', body: undefined });
    expect(result.url).toBe('https://capture/x');
  });

  it('kyb.listApplicants passes status/stage/search through', async () => {
    const { protegey, lastCall } = setup({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await protegey.kyb.listApplicants({ status: 'PENDING_REVIEW', stage: 'responded', search: 'acme' });
    expect(lastCall().url).toBe(`${BASE}/partner-api/kyb/applicants?status=PENDING_REVIEW&stage=responded&search=acme`);
  });

  it('kyb.getApplicant / screenApplicant GET the applicant routes', async () => {
    const { protegey, lastCall } = setup({});
    await protegey.kyb.getApplicant('c1');
    expect(lastCall()).toMatchObject({ url: `${BASE}/partner-api/kyb/applicants/c1`, method: 'GET' });
    await protegey.kyb.screenApplicant('c1');
    expect(lastCall()).toMatchObject({ url: `${BASE}/partner-api/kyb/applicants/c1/screen`, method: 'GET' });
  });

  it('kyb.inviteApplicant accepts a phone-only invite and returns applicationUrl', async () => {
    const { protegey, lastCall } = setup({
      id: 'c1',
      contactEmail: null,
      contactPhone: '+237690000000',
      status: 'INVITED',
      applicationUrl: 'https://portal/client-application?token=t',
    });
    const result = await protegey.kyb.inviteApplicant({ contactName: 'John', contactPhone: '+237690000000' });
    expect(lastCall()).toEqual({
      url: `${BASE}/partner-api/kyb/applicants`,
      method: 'POST',
      body: { contactName: 'John', contactPhone: '+237690000000' },
    });
    expect(result.applicationUrl).toBe('https://portal/client-application?token=t');
  });

  it('kyb.inviteApplicant requires at least one of contactEmail / contactPhone at the type level', () => {
    const { protegey } = setup({});
    // @ts-expect-error — neither contactEmail nor contactPhone
    void protegey.kyb.inviteApplicant({ contactName: 'John' }).catch(() => undefined);
  });

  it('kyb.resendInvitation POSTs to resend-invitation', async () => {
    const { protegey, lastCall } = setup({ id: 'sub1', status: 'PENDING', applicationUrl: 'https://portal/x' });
    const result = await protegey.kyb.resendInvitation('c1');
    expect(lastCall()).toEqual({ url: `${BASE}/partner-api/kyb/applicants/c1/resend-invitation`, method: 'POST', body: undefined });
    expect(result.applicationUrl).toBe('https://portal/x');
  });

  it('kyb.decide PATCHes the decision', async () => {
    const { protegey, lastCall } = setup({ id: 'c1', status: 'MORE_INFO_REQUIRED', applicationUrl: 'https://portal/y' });
    const result = await protegey.kyb.decide('c1', { decision: 'REQUEST_MORE_INFO', note: 'Upload your licence' });
    expect(lastCall()).toEqual({
      url: `${BASE}/partner-api/kyb/applicants/c1/decide`,
      method: 'PATCH',
      body: { decision: 'REQUEST_MORE_INFO', note: 'Upload your licence' },
    });
    expect(result.applicationUrl).toBe('https://portal/y');
  });

  it('transactions.list passes filters as a query string', async () => {
    const { protegey, lastCall } = setup({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await protegey.transactions.list({ decision: 'BLOCKED', direction: 'DEBIT', externalCustomerId: 'cust-1', dateFrom: '2026-11-01T00:00:00Z' });
    expect(lastCall().url).toBe(
      `${BASE}/partner-api/transactions?decision=BLOCKED&direction=DEBIT&externalCustomerId=cust-1&dateFrom=2026-11-01T00%3A00%3A00Z`,
    );
  });

  it('transactions.get GETs by id (Protegey or external), URL-encoded', async () => {
    const { protegey, lastCall } = setup({});
    await protegey.transactions.get('tx/1');
    expect(lastCall()).toMatchObject({ url: `${BASE}/partner-api/transactions/tx%2F1`, method: 'GET' });
  });

  it('alerts.list lowercases the status/disposition filters, as the API requires', async () => {
    const { protegey, lastCall } = setup({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await protegey.alerts.list({ status: 'MORE_INFO_REQUESTED', disposition: 'FALSE_POSITIVE', alertNumber: 12, ruleCode: 'VEL-001' });
    expect(lastCall().url).toBe(
      `${BASE}/partner-api/alerts?alertNumber=12&ruleCode=VEL-001&status=more_info_requested&disposition=false_positive`,
    );
  });

  it('alerts.get / update / flagTransaction / convertToCase hit the right routes', async () => {
    const { protegey, lastCall } = setup({});
    await protegey.alerts.get('a1');
    expect(lastCall()).toMatchObject({ url: `${BASE}/partner-api/alerts/a1`, method: 'GET' });

    await protegey.alerts.update('a1', { status: 'CONFIRMED', disposition: 'CONFIRMED_FRAUD', assignedToUserId: null });
    expect(lastCall()).toEqual({
      url: `${BASE}/partner-api/alerts/a1`,
      method: 'PATCH',
      body: { status: 'CONFIRMED', disposition: 'CONFIRMED_FRAUD', assignedToUserId: null },
    });

    await protegey.alerts.flagTransaction('tx-uuid');
    expect(lastCall()).toEqual({ url: `${BASE}/partner-api/alerts/flag-transaction`, method: 'POST', body: { transactionId: 'tx-uuid' } });

    await protegey.alerts.convertToCase('a1');
    expect(lastCall()).toEqual({ url: `${BASE}/partner-api/alerts/a1/convert-to-case`, method: 'POST', body: undefined });
  });

  it('sanctions.screen POSTs the name with a lowercase type', async () => {
    const { protegey, lastCall } = setup({ decision: 'CLEAR', score: 0, matches: [], pepMatch: false });
    const result = await protegey.sanctions.screen({ name: 'John Doe', type: 'person' });
    expect(lastCall()).toEqual({ url: `${BASE}/partner-api/sanctions/screen`, method: 'POST', body: { name: 'John Doe', type: 'person' } });
    expect(result.decision).toBe('CLEAR');
  });

  it('sharedSignals.check POSTs identifiers and exposes flagConfidence/matchCount/matches', async () => {
    const { protegey, lastCall } = setup({
      flagged: true,
      category: 'CONFIRMED_FRAUD',
      reportedDaysAgo: 3,
      flagConfidence: 37,
      matchCount: 2,
      matches: [
        { category: 'CONFIRMED_FRAUD', reportedDaysAgo: 3 },
        { category: 'IDENTITY_THEFT', reportedDaysAgo: 40 },
      ],
    });
    const result = await protegey.sharedSignals.check({ phoneNumber: '+22890000001', governmentId: 'ID-1', externalCustomerId: 'cust-1' });
    expect(lastCall()).toEqual({
      url: `${BASE}/partner-api/shared-signal/check`,
      method: 'POST',
      body: { phoneNumber: '+22890000001', governmentId: 'ID-1', externalCustomerId: 'cust-1' },
    });
    expect(result.matchCount).toBe(2);
    expect(Object.keys(result.matches[0])).toEqual(['category', 'reportedDaysAgo']);
  });

  it('surfaces errorCode on a PARTNER_SUSPENDED 403', async () => {
    const { protegey } = setup({ errorCode: 'PARTNER_SUSPENDED', message: 'Account suspended' }, 403);
    await expect(protegey.alerts.convertToCase('a1')).rejects.toMatchObject({
      status: 403,
      errorCode: 'PARTNER_SUSPENDED',
      message: 'Account suspended',
    });
  });
});
