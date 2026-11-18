import { withQuery, type ProtegeyHttpClient } from './client.js';
import type {
  ListTransactionsQuery,
  Paginated,
  ReportTransactionInput,
  ReportTransactionResult,
  TransactionDetail,
  TransactionSummary,
} from './types.js';

export class TransactionsModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Thin, faithful mapping onto POST /partner-api/transactions — all validation and business logic
   * stays server-side. Re-sending an `externalTransactionId` throws a 409 ProtegeyApiError. Sandbox
   * keys are limited to 100 transactions/day. */
  async report(input: ReportTransactionInput): Promise<ReportTransactionResult> {
    return this.http.post<ReportTransactionResult>('/partner-api/transactions', {
      ...input,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    });
  }

  /** Lists your transactions, newest `occurredAt` first. */
  async list(query: ListTransactionsQuery = {}): Promise<Paginated<TransactionSummary>> {
    return this.http.get<Paginated<TransactionSummary>>(withQuery('/partner-api/transactions', { ...query }));
  }

  /** One transaction with its alerts. `id` may be Protegey's `transactionId` or your own
   * `externalTransactionId`. */
  async get(id: string): Promise<TransactionDetail> {
    return this.http.get<TransactionDetail>(`/partner-api/transactions/${encodeURIComponent(id)}`);
  }
}
