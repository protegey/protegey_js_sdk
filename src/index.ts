import { ProtegeyHttpClient } from './client.js';
import { DeviceModule } from './device.js';
import { TransactionsModule } from './transactions.js';
import { KycModule } from './kyc.js';
import type { ProtegeyOptions } from './types.js';

/**
 * The Protegey SDK — one client for device intelligence, transaction reporting and identity
 * verification, usable identically from Node.js, the browser (React, Angular, plain JS) and
 * React Native.
 *
 * ```ts
 * const protegey = new Protegey({ apiKey: 'YOUR_API_KEY', baseUrl: 'https://api.protegey.com' });
 * const { visitorId, action } = await protegey.device.identify({ externalCustomerId: 'cust-1' });
 * await protegey.transactions.report({ externalTransactionId: 'tx-1', ... });
 * const { url } = await protegey.kyc.startSession({ externalUserId: 'cust-1' });
 * ```
 *
 * `baseUrl` has no default — confirm the current value with Protegey (it may differ between
 * environments and can change independently of this package).
 *
 * Namespaced (`.device`, `.transactions`, `.kyc`) so more of the partner-api surface can be added
 * later (behavioral events, shared-signal checks, ...) without breaking this shape.
 */
export class Protegey {
  readonly device: DeviceModule;
  readonly transactions: TransactionsModule;
  readonly kyc: KycModule;

  constructor(options: ProtegeyOptions) {
    const http = new ProtegeyHttpClient(options.apiKey, options.baseUrl);
    this.device = new DeviceModule(http);
    this.transactions = new TransactionsModule(http);
    this.kyc = new KycModule(http);
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
} from './types.js';
