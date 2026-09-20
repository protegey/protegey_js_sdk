import { describe, expect, it, vi } from 'vitest';
import { TransactionsModule } from '../src/transactions.js';
import type { ReportTransactionInput, ReportTransactionResult } from '../src/types.js';

function buildHttp(response: Partial<ReportTransactionResult> = {}) {
  return { post: vi.fn(async () => response) };
}

const baseInput: ReportTransactionInput = {
  externalTransactionId: 'tx-1',
  externalCustomerId: 'cust-1',
  direction: 'DEBIT',
  amount: 1000,
  transactionType: 'cashout',
};

describe('TransactionsModule.report', () => {
  it('posts a faithful mapping of the input to /partner-api/transactions', async () => {
    const http = buildHttp();
    const transactions = new TransactionsModule(http as never);

    await transactions.report(baseInput);

    expect(http.post).toHaveBeenCalledWith('/partner-api/transactions', expect.objectContaining(baseInput));
  });

  it('defaults occurredAt to now when not provided', async () => {
    const http = buildHttp();
    const transactions = new TransactionsModule(http as never);

    await transactions.report(baseInput);

    const [, body] = http.post.mock.calls[0] as [string, { occurredAt: string }];
    expect(new Date(body.occurredAt).getTime()).not.toBeNaN();
  });

  it('preserves a caller-supplied occurredAt instead of overriding it', async () => {
    const http = buildHttp();
    const transactions = new TransactionsModule(http as never);

    await transactions.report({ ...baseInput, occurredAt: '2026-01-01T00:00:00.000Z' });

    expect(http.post).toHaveBeenCalledWith('/partner-api/transactions', expect.objectContaining({ occurredAt: '2026-01-01T00:00:00.000Z' }));
  });

  it('passes device-intelligence fields through when given', async () => {
    const http = buildHttp();
    const transactions = new TransactionsModule(http as never);

    await transactions.report({ ...baseInput, visitorId: 'v1', deviceAttributes: { isRooted: true } });

    expect(http.post).toHaveBeenCalledWith(
      '/partner-api/transactions',
      expect.objectContaining({ visitorId: 'v1', deviceAttributes: { isRooted: true } }),
    );
  });
});
