import type { ProtegeyHttpClient } from './client.js';
import type { ReportBehavioralEventInput, ReportBehavioralEventResult } from './types.js';

export class BehavioralModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Reports one session's aggregated keystroke/touch/navigation/session metadata. The first few
   * sessions for a customer come back as "learning" (no score yet) while Protegey builds their
   * baseline — this is expected, not an error. */
  async report(input: ReportBehavioralEventInput): Promise<ReportBehavioralEventResult> {
    return this.http.post<ReportBehavioralEventResult>('/partner-api/behavioral-events', input);
  }
}
