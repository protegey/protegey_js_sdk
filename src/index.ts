import { ProtegeyHttpClient } from './client.js';
import { DeviceModule } from './device.js';
import { TransactionsModule } from './transactions.js';
import type { ProtegeyOptions } from './types.js';

/**
 * The Protegey SDK — one client for device intelligence and transaction reporting, usable
 * identically from Node.js, the browser (React, Angular, plain JS) and React Native.
 *
 * ```ts
 * const protegey = new Protegey({ apiKey: 'YOUR_API_KEY' });
 * const { visitorId, action } = await protegey.device.identify({ externalCustomerId: 'cust-1' });
 * await protegey.transactions.report({ externalTransactionId: 'tx-1', ... });
 * ```
 *
 * Namespaced (`.device`, `.transactions`) so more of the partner-api surface can be added later
 * (behavioral events, shared-signal checks, ...) without breaking this shape.
 */
export class Protegey {
  readonly device: DeviceModule;
  readonly transactions: TransactionsModule;

  constructor(options: ProtegeyOptions) {
    const http = new ProtegeyHttpClient(options.apiKey, options.baseUrl);
    this.device = new DeviceModule(http);
    this.transactions = new TransactionsModule(http);
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
} from './types.js';
