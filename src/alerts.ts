import { withQuery, type ProtegeyHttpClient } from './client.js';
import type { AlertWithContext, ConvertAlertToCaseResult, ListAlertsQuery, Paginated, UpdateAlertInput } from './types.js';

function alertPath(id: string): string {
  return `/partner-api/alerts/${encodeURIComponent(id)}`;
}

export class AlertsModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Lists alerts, newest first. The `status`/`disposition` filters only accept lowercase on the
   * wire — pass the UPPERCASE values you get back in responses and the SDK converts them. */
  async list(query: ListAlertsQuery = {}): Promise<Paginated<AlertWithContext>> {
    const { status, disposition, ...rest } = query;
    return this.http.get<Paginated<AlertWithContext>>(
      withQuery('/partner-api/alerts', { ...rest, status: status?.toLowerCase(), disposition: disposition?.toLowerCase() }),
    );
  }

  async get(id: string): Promise<AlertWithContext> {
    return this.http.get<AlertWithContext>(alertPath(id));
  }

  /** Manually raises an alert on a transaction (rule `MANUAL-FLAG-001`). `transactionId` must be
   * Protegey's transaction uuid, not your external id. Idempotent: an existing OPEN alert on that
   * transaction is returned instead of creating a second one. */
  async flagTransaction(transactionId: string): Promise<AlertWithContext> {
    return this.http.post<AlertWithContext>('/partner-api/alerts/flag-transaction', { transactionId });
  }

  /** Updates status / disposition / assignment / notes / due date. Always fires
   * `alert.status_changed`. */
  async update(id: string, input: UpdateAlertInput): Promise<AlertWithContext> {
    return this.http.patch<AlertWithContext>(alertPath(id), input);
  }

  /** Opens a case from this alert and sets its disposition to ESCALATED. */
  async convertToCase(id: string): Promise<ConvertAlertToCaseResult> {
    return this.http.post<ConvertAlertToCaseResult>(`${alertPath(id)}/convert-to-case`);
  }
}
