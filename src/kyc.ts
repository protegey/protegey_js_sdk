import type { ProtegeyHttpClient } from './client.js';
import type { KycSessionStatus, StartKycSessionInput, StartKycSessionResult } from './types.js';

export class KycModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Starts an identity verification session for one of your end users — no curl/manual API call needed. */
  async startSession(input: StartKycSessionInput): Promise<StartKycSessionResult> {
    return this.http.post<StartKycSessionResult>('/partner-api/kyc/sessions', input);
  }

  /** Polling fallback for the webhook — call this if you're not sure a webhook delivery ever
   * arrived (best-effort: one retry, no queue). `sessionId` is the value returned by startSession(). */
  async getSession(sessionId: string): Promise<KycSessionStatus> {
    return this.http.get<KycSessionStatus>(`/partner-api/kyc/sessions/${encodeURIComponent(sessionId)}`);
  }
}
