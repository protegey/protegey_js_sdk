import type { ProtegeyHttpClient } from './client.js';
import { computeFingerprint } from './fingerprint.js';
import type { IdentifyInput, IdentifyResult } from './types.js';

function randomEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class DeviceModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /**
   * Computes a device/session fingerprint (real browser fingerprinting when running in a
   * browser; pass your own `visitorId` when calling from Node.js or React Native, where there's
   * no DOM to fingerprint) and reports it to Protegey — replaces what a Keverd SDK call used to do.
   */
  async identify(input: IdentifyInput = {}): Promise<IdentifyResult> {
    const computed = input.visitorId ? { visitorId: input.visitorId, attributes: {} } : await computeFingerprint();
    const attributes = { ...computed.attributes, ...input.deviceAttributes };

    const result = await this.http.post<{ recorded: boolean; action: IdentifyResult['action']; riskScore: number | null }>(
      '/partner-api/device-events',
      {
        eventId: input.eventId ?? randomEventId(),
        externalCustomerId: input.externalCustomerId,
        visitorId: computed.visitorId,
        deviceAttributes: attributes,
        phoneNumber: input.phoneNumber,
      },
    );

    return { ...result, visitorId: computed.visitorId };
  }
}
