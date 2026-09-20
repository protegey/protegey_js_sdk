import { ProtegeyHttpClient } from './client.js';
import { DeviceModule } from './device.js';
import { TransactionsModule } from './transactions.js';
import { KycModule } from './kyc.js';
import { BehavioralModule } from './behavioral.js';
import type { ProtegeyOptions } from './types.js';

/**
 * The Protegey SDK — one client for device intelligence, transaction reporting, identity
 * verification and behavioral biometrics, usable identically from Node.js, the browser (React,
 * Angular, plain JS) and React Native.
 *
 * ```ts
 * const protegey = new Protegey({ apiKey: 'YOUR_API_KEY', baseUrl: 'https://api.protegey.com' });
 * const { visitorId, action } = await protegey.device.identify({ externalCustomerId: 'cust-1' });
 * await protegey.transactions.report({ externalTransactionId: 'tx-1', ... });
 * const { url } = await protegey.kyc.startSession({ externalUserId: 'cust-1' });
 * await protegey.behavioral.report({ externalCustomerId: 'cust-1', sessionId: 'sess-1', keystroke: { ... } });
 * ```
 *
 * `baseUrl` has no default — confirm the current value with Protegey (it may differ between
 * environments and can change independently of this package).
 *
 * Namespaced (`.device`, `.transactions`, `.kyc`, `.behavioral`) so more of the partner-api
 * surface can be added later (shared-signal checks, ...) without breaking this shape.
 */
export class Protegey {
  readonly device: DeviceModule;
  readonly transactions: TransactionsModule;
  readonly kyc: KycModule;
  readonly behavioral: BehavioralModule;

  constructor(options: ProtegeyOptions) {
    const http = new ProtegeyHttpClient(options.apiKey, options.baseUrl);
    this.device = new DeviceModule(http);
    this.transactions = new TransactionsModule(http);
    this.kyc = new KycModule(http);
    this.behavioral = new BehavioralModule(http);
  }
}

export { ProtegeyApiError } from './client.js';
export type {
  DeviceAttributes,
  DeviceAction,
  IdentifyInput,
  IdentifyResult,
  ReportTransactionInput,
  ReportTransactionResult,
  TransactionDirection,
  ProtegeyOptions,
  Alert,
  StartKycSessionInput,
  StartKycSessionResult,
  KycSessionStatus,
  KeystrokeMetrics,
  TouchMetrics,
  NavigationMetrics,
  SessionMetrics,
  ReportBehavioralEventInput,
  ReportBehavioralEventResult,
  BehavioralConfidenceTier,
} from './types.js';
