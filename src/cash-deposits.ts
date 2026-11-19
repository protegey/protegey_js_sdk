import { withQuery, type ProtegeyHttpClient } from './client.js';
import type {
  CashDeposit,
  CashDepositDetail,
  ListCashDepositsQuery,
  Paginated,
  RecordCashDepositInput,
  RecordCashDepositResult,
} from './types.js';

export class CashDepositsModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Records a cash deposit taken in your own system — POST /partner-api/cash-deposits. It runs
   * through the same rules as a transaction and returns the decision and any alerts raised.
   * Re-sending an `externalTransactionId` throws a 409 ProtegeyApiError. */
  async record(input: RecordCashDepositInput): Promise<RecordCashDepositResult> {
    return this.http.post<RecordCashDepositResult>('/partner-api/cash-deposits', input);
  }

  /** Lists your cash deposits, newest `depositedAt` first. `limit` is at most 100. */
  async list(query: ListCashDepositsQuery = {}): Promise<Paginated<CashDeposit>> {
    return this.http.get<Paginated<CashDeposit>>(withQuery('/partner-api/cash-deposits', { ...query }));
  }

  /** One cash deposit with its alerts. `id` may be Protegey's `cashDepositId` or your own
   * `externalTransactionId`. */
  async get(id: string): Promise<CashDepositDetail> {
    return this.http.get<CashDepositDetail>(`/partner-api/cash-deposits/${encodeURIComponent(id)}`);
  }
}
