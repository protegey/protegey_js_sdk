import type { ProtegeyHttpClient } from './client.js';
import type { StartKycSessionInput, StartKycSessionResult } from './types.js';

export class KycModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Starts an identity verification session for one of your end users — no curl/manual API call needed. */
  async startSession(input: StartKycSessionInput): Promise<StartKycSessionResult> {
    return this.http.post<StartKycSessionResult>('/partner-api/kyc/sessions', input);
  }
}
