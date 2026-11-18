import type { ProtegeyHttpClient } from './client.js';
import type { SanctionsScreeningResult, ScreenNameInput } from './types.js';

export class SanctionsModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Screens one name against the sanctions and PEP lists. `type` must be lowercase
   * ('person' | 'business'). */
  async screen(input: ScreenNameInput): Promise<SanctionsScreeningResult> {
    return this.http.post<SanctionsScreeningResult>('/partner-api/sanctions/screen', input);
  }
}
