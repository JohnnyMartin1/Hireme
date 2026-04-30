/** Phase 4 — offer workflow (recruiter-only; not exposed to job seekers). */

export const OFFER_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const HIRING_OUTCOMES = [
  "NOT_HIRED",
  "OFFER_IN_PROGRESS",
  "OFFER_ACCEPTED",
  "HIRED",
  "DECLINED",
  "ROLE_FILLED",
] as const;

export type HiringOutcome = (typeof HIRING_OUTCOMES)[number];

export const COMPENSATION_TYPES = ["SALARY", "HOURLY", "CONTRACT", "OTHER"] as const;
export type CompensationType = (typeof COMPENSATION_TYPES)[number];

export const OFFER_APPROVAL_STATUSES = ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"] as const;
export type OfferApprovalStatus = (typeof OFFER_APPROVAL_STATUSES)[number];

/** Firestore `candidateOffers` document shape (camelCase). */
export type CandidateOfferRecord = {
  id: string;
  companyId: string;
  employerId: string;
  createdBy: string;
  jobId: string;
  candidateId: string;
  pipelineEntryId?: string | null;
  messageThreadId?: string | null;
  debriefId?: string | null;
  status: OfferStatus;
  title: string;
  roleTitle: string;
  compensationType: CompensationType;
  baseSalary: number | null;
  bonus: string | null;
  equity: string | null;
  hourlyRate: number | null;
  currency: string;
  startDate: string | null;
  workLocation: string | null;
  employmentType: string | null;
  expirationDate: string | null;
  offerNotes: string | null;
  internalNotes: string | null;
  approvalRequired: boolean;
  approverUserIds: string[];
  approvalStatus: OfferApprovalStatus;
  approvedBy: string | null;
  approvedAt: unknown | null;
  sentAt: unknown | null;
  acceptedAt: unknown | null;
  declinedAt: unknown | null;
  withdrawnAt: unknown | null;
  declineReason: string | null;
  offerLetterUrl: string | null;
  offerLetterFileName: string | null;
  supersededByOfferId?: string | null;
  createdAt: unknown;
  updatedAt: unknown;
};

export function normalizeOfferStatus(value: unknown): OfferStatus {
  const raw = String(value || "").toUpperCase().trim();
  if ((OFFER_STATUSES as readonly string[]).includes(raw)) return raw as OfferStatus;
  return "DRAFT";
}

export function normalizeHiringOutcome(value: unknown): HiringOutcome {
  const raw = String(value || "").toUpperCase().trim();
  if ((HIRING_OUTCOMES as readonly string[]).includes(raw)) return raw as HiringOutcome;
  return "NOT_HIRED";
}

export function normalizeCompensationType(value: unknown): CompensationType {
  const raw = String(value || "").toUpperCase().trim();
  if ((COMPENSATION_TYPES as readonly string[]).includes(raw)) return raw as CompensationType;
  return "SALARY";
}
