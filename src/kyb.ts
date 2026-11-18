import { withQuery, type ProtegeyHttpClient } from './client.js';
import type {
  DecideKybApplicantInput,
  DecideKybApplicantResult,
  InviteKybApplicantInput,
  InviteKybApplicantResult,
  KybApplicant,
  KybScreeningResult,
  ListKybApplicantsQuery,
  Paginated,
  ResendKybInvitationResult,
} from './types.js';

function applicantPath(clientId: string): string {
  return `/partner-api/kyb/applicants/${encodeURIComponent(clientId)}`;
}

/** Business onboarding (KYB): invite a business, let it fill in its questionnaire, then screen and
 * decide. KYB has no sandbox/live split — both keys act on the same applicants. */
export class KybModule {
  constructor(private readonly http: ProtegeyHttpClient) {}

  async listApplicants(query: ListKybApplicantsQuery = {}): Promise<Paginated<KybApplicant>> {
    return this.http.get<Paginated<KybApplicant>>(withQuery('/partner-api/kyb/applicants', { ...query }));
  }

  async getApplicant(clientId: string): Promise<KybApplicant> {
    return this.http.get<KybApplicant>(applicantPath(clientId));
  }

  /** Invites a business by email and/or phone (at least one). Protegey emails the link only when
   * `contactEmail` is set — the returned `applicationUrl` lets you deliver it yourself otherwise. */
  async inviteApplicant(input: InviteKybApplicantInput): Promise<InviteKybApplicantResult> {
    return this.http.post<InviteKybApplicantResult>('/partner-api/kyb/applicants', input);
  }

  /** Rotates the invitation link. Only allowed while the application is PENDING or
   * MORE_INFO_REQUIRED. Returns the submission (not the business) plus the new `applicationUrl`. */
  async resendInvitation(clientId: string): Promise<ResendKybInvitationResult> {
    return this.http.post<ResendKybInvitationResult>(`${applicantPath(clientId)}/resend-invitation`);
  }

  /** Runs sanctions/PEP screening of the business and each beneficial owner now, and stores the
   * result on the submission. */
  async screenApplicant(clientId: string): Promise<KybScreeningResult> {
    return this.http.get<KybScreeningResult>(`${applicantPath(clientId)}/screen`);
  }

  /** Approves, rejects (with `reason`) or requests more info (with `note`) on a SUBMITTED
   * application. Fires `kyb.status_changed`. */
  async decide(clientId: string, input: DecideKybApplicantInput): Promise<DecideKybApplicantResult> {
    return this.http.patch<DecideKybApplicantResult>(`${applicantPath(clientId)}/decide`, input);
  }
}
