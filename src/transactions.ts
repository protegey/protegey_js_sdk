import type { ProtegeyHttpClient } from './client.js';
import type { ReportTransactionInput, ReportTransactionResult } from './types.js';

export class TransactionsModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Thin, faithful mapping onto POST /partner-api/transactions — all validation and business logic stays server-side. */
  async report(input: ReportTransactionInput): Promise<ReportTransactionResult> {
    return this.http.post<ReportTransactionResult>('/partner-api/transactions', {
      ...input,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    });
  }
}
