import { ProtegeyHttpClient } from './client.js';
import { DeviceModule } from './device.js';
import { TransactionsModule } from './transactions.js';
import { CashDepositsModule } from './cash-deposits.js';
import { AlertsModule } from './alerts.js';
import { KycModule } from './kyc.js';
import { KybModule } from './kyb.js';
import { BehavioralModule } from './behavioral.js';
import { SanctionsModule } from './sanctions.js';
import { SharedSignalsModule } from './shared-signals.js';
import type { ProtegeyOptions } from './types.js';

/**
 * The Protegey SDK — one client for the whole partner API (device intelligence, transaction
 * monitoring, cash deposits, alerts, KYC, KYB, sanctions screening, the shared fraud signal network and behavioral
 * biometrics), usable identically from Node.js, the browser (React, Angular, plain JS) and React
 * Native.
 *
 * ```ts
 * const protegey = new Protegey({ apiKey: 'YOUR_API_KEY', baseUrl: 'https://api.protegey.com' });
 * const { visitorId, action } = await protegey.device.identify({ externalCustomerId: 'cust-1' });
 * await protegey.transactions.report({ externalTransactionId: 'tx-1', ... });
 * await protegey.cashDeposits.record({ externalCustomerId: 'cust-1', amount: 2500000, currency: 'XOF' });
 * const { url } = await protegey.kyc.startSession({ externalUserId: 'cust-1' });
 * const { applicationUrl } = await protegey.kyb.inviteApplicant({ contactName: 'Awa', contactPhone: '+22890000001' });
 * ```
 *
 * `baseUrl` has no default — confirm the current value with Protegey (it may differ between
 * environments and can change independently of this package).
 */
export class Protegey {
  readonly device: DeviceModule;
  readonly transactions: TransactionsModule;
  readonly cashDeposits: CashDepositsModule;
  readonly alerts: AlertsModule;
  readonly kyc: KycModule;
  readonly kyb: KybModule;
  readonly behavioral: BehavioralModule;
  readonly sanctions: SanctionsModule;
  readonly sharedSignals: SharedSignalsModule;

  constructor(options: ProtegeyOptions) {
    const http = new ProtegeyHttpClient(options.apiKey, options.baseUrl);
    this.device = new DeviceModule(http);
    this.transactions = new TransactionsModule(http);
    this.cashDeposits = new CashDepositsModule(http);
    this.alerts = new AlertsModule(http);
    this.kyc = new KycModule(http);
    this.kyb = new KybModule(http);
    this.behavioral = new BehavioralModule(http);
    this.sanctions = new SanctionsModule(http);
    this.sharedSignals = new SharedSignalsModule(http);
  }
}

export { ProtegeyApiError } from './client.js';
export {
  verifyWebhookSignature,
  constructWebhookEvent,
  ProtegeyWebhookSignatureError,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from './webhooks.js';
export type { VerifyWebhookInput } from './webhooks.js';
export type * from './types.js';
