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

/** The KYC list `status` filter only accepts the backend's internal Title Case values on the wire
 * (`?status=IN_REVIEW` is rejected with 400) — callers pass the UPPERCASE value they get back in
 * responses, and this converts it. */
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

  /** Lists your KYC sessions, newest first. */
  async listSessions(query: ListKycSessionsQuery = {}): Promise<Paginated<KycSessionSummary>> {
    const { status, ...rest } = query;
    return this.http.get<Paginated<KycSessionSummary>>(
      withQuery('/partner-api/kyc/sessions', { ...rest, status: status ? KYC_STATUS_FILTER[status] : undefined }),
    );
  }

  /** Full session detail, including the decision and photos. Also the polling fallback for the
   * `kyc.status_changed` webhook. `sessionId` is the value returned by startSession(). */
  async getSession(sessionId: string): Promise<KycSessionStatus> {
    return this.http.get<KycSessionStatus>(sessionPath(sessionId));
  }

  /** Corrects identity fields and/or overrides the status (APPROVED / DECLINED / IN_REVIEW) after
   * a manual review. The override is recorded in `decision.manualReview`; no webhook fires. */
  async updateSession(sessionId: string, input: UpdateKycSessionInput): Promise<UpdateKycSessionResult> {
    return this.http.patch<UpdateKycSessionResult>(sessionPath(sessionId), input);
  }

  /** Issues a fresh 30-minute capture link for an existing session (status becomes RESUBMITTED).
   * Doesn't count against the sandbox quota. */
  async resendSession(sessionId: string): Promise<StartKycSessionResult> {
    return this.http.post<StartKycSessionResult>(`${sessionPath(sessionId)}/resend`);
  }
}
