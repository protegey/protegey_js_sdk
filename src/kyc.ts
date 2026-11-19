import { withQuery, type ProtegeyHttpClient } from './client.js';
import type {
  KycSessionStatus,
  KycSessionSummary,
  KycStatus,
  ListKycSessionsQuery,
  Paginated,
  StartKycSessionInput,
  StartKycSessionResult,
  UpdateKycSessionInput,
  UpdateKycSessionResult,
} from './types.js';

/** The KYC list `status` filter is sent in the backend's canonical Title Case form ("In Review").
 * Current backends accept any casing, but older ones rejected `?status=IN_REVIEW` with 400 —
 * callers pass the UPPERCASE value they get back in responses, and this converts it. */
const KYC_STATUS_FILTER: Record<KycStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  AWAITING_USER: 'Awaiting User',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  RESUBMITTED: 'Resubmitted',
  ABANDONED: 'Abandoned',
  EXPIRED: 'Expired',
  KYC_EXPIRED: 'Kyc Expired',
};

function sessionPath(sessionId: string): string {
  return `/partner-api/kyc/sessions/${encodeURIComponent(sessionId)}`;
}

export class KycModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  /** Starts an identity verification session for one of your end users and returns the hosted
   * capture link (single-use, valid 30 minutes). Sandbox keys are limited to 10 sessions/day. */
  async startSession(input: StartKycSessionInput): Promise<StartKycSessionResult> {
    return this.http.post<StartKycSessionResult>('/partner-api/kyc/sessions', input);
  }

  /** Lists your KYC sessions, newest first. Filter by `externalUserId` (exact match) to find a
   * given customer's sessions. Each row carries `recommendation` and pre-signed `images` links
   * (valid 1 hour, re-issued on every call). */
  async listSessions(query: ListKycSessionsQuery = {}): Promise<Paginated<KycSessionSummary>> {
    const { status, ...rest } = query;
    return this.http.get<Paginated<KycSessionSummary>>(
      withQuery('/partner-api/kyc/sessions', { ...rest, status: status ? KYC_STATUS_FILTER[status] : undefined }),
    );
  }

  /** Full session detail: status, Protegey's `recommendation`, the decision, and the photos — as
   * pre-signed `images` links (valid 1 hour, re-issued on every GET: download within the hour) and
   * as legacy base64 fields. Also the polling fallback for the `kyc.status_changed` webhook.
   * `sessionId` is the value returned by startSession() (and carried by the webhook). */
  async getSession(sessionId: string): Promise<KycSessionStatus> {
    return this.http.get<KycSessionStatus>(sessionPath(sessionId));
  }

  /** Corrects identity fields and/or overrides the status (APPROVED / DECLINED / IN_REVIEW) after
   * a manual review, with an optional `reviewNote`. The override is recorded in
   * `decision.manualReview` (`recommendation` is left unchanged), and a status change fires the
   * `kyc.status_changed` webhook. */
  async updateSession(sessionId: string, input: UpdateKycSessionInput): Promise<UpdateKycSessionResult> {
    return this.http.patch<UpdateKycSessionResult>(sessionPath(sessionId), input);
  }

  /** Issues a fresh 30-minute capture link for an existing session (status becomes RESUBMITTED).
   * Doesn't count against the sandbox quota. */
  async resendSession(sessionId: string): Promise<StartKycSessionResult> {
    return this.http.post<StartKycSessionResult>(`${sessionPath(sessionId)}/resend`);
  }
}
