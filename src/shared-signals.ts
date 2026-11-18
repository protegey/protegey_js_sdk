import type { ProtegeyHttpClient } from './client.js';
import type { CheckSharedSignalInput, CheckSharedSignalResult } from './types.js';

export class SharedSignalsModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Checks identifiers against fraud reported by other Protegey partners. Requires the shared
   * fraud signal network to have been enabled on your account for 7 consecutive days (400
   * otherwise). Provide at least one identifier. */
  async check(input: CheckSharedSignalInput): Promise<CheckSharedSignalResult> {
    return this.http.post<CheckSharedSignalResult>('/partner-api/shared-signal/check', input);
  }
}
