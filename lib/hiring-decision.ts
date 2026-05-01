export const REVIEW_STATUSES = [
  "REQUESTED",
  "SUBMITTED",
  "APPROVED",
  "DECLINED",
  "NEEDS_DISCUSSION",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const OVERALL_RECOMMENDATIONS = [
  "STRONG_YES",
  "YES",
  "MIXED",
  "NO",
  "HOLD",
] as const;

export type OverallRecommendation = (typeof OVERALL_RECOMMENDATIONS)[number];

export type JobEvaluationCriterion = {
  id: string;
  label: string;
  description?: string;
  weight?: number | null;
  priority?: number | null;
  order: number;
  active: boolean;
};

export type CriterionRating = {
  criterionId: string;
  rating: number;
  comment?: string;
};

export type CandidateEvaluation = {
  id: string;
  jobId: string;
  candidateId: string;
  authorUserId: string;
  evaluatorType: "RECRUITER" | "HIRING_MANAGER" | "INTERVIEWER";
  overallRecommendation: OverallRecommendation;
  criterionRatings: CriterionRating[];
  summary?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CandidateReviewRequest = {
  id: string;
  jobId: string;
  candidateId: string;
  requestedByUserId: string;
  requestedReviewerUserId?: string | null;
  status: ReviewStatus;
  requestedAt?: unknown;
  reviewedAt?: unknown;
  linkedEvaluationId?: string | null;
  reviewSummary?: string | null;
  updatedAt?: unknown;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date; _seconds?: number };
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function recommendationLabel(value: OverallRecommendation | string | null | undefined): string {
  switch (String(value || "")) {
    case "STRONG_YES":
      return "Strong Yes";
    case "YES":
      return "Yes";
    case "MIXED":
      return "Mixed";
    case "NO":
      return "No";
    case "HOLD":
      return "Hold";
    default:
      return "Not set";
  }
}

export function reviewStatusLabel(value: ReviewStatus | string | null | undefined): string {
  switch (String(value || "")) {
    case "REQUESTED":
      return "Awaiting review";
    case "SUBMITTED":
      return "Review submitted";
    case "APPROVED":
      return "Approved";
    case "DECLINED":
      return "Declined";
    case "NEEDS_DISCUSSION":
      return "Needs discussion";
    default:
      return "No review requested";
  }
}

export function compareByUpdatedDesc(a: { updatedAt?: unknown; createdAt?: unknown }, b: { updatedAt?: unknown; createdAt?: unknown }): number {
  const aDate = toDate(a.updatedAt || a.createdAt);
  const bDate = toDate(b.updatedAt || b.createdAt);
  return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
}

export type CandidateEvaluationSummary = {
  count: number;
  avgRating: number | null;
  latestRecommendation: OverallRecommendation | null;
  latestSummary: string | null;
  criteriaCovered: number;
  criteriaExpected: number;
  isComplete: boolean;
};

export function summarizeCandidateEvaluations(
  evaluations: CandidateEvaluation[],
  activeCriteria: JobEvaluationCriterion[]
): CandidateEvaluationSummary {
  const sorted = [...evaluations].sort(compareByUpdatedDesc);
  const count = sorted.length;
  const allRatings = sorted.flatMap((e) => Array.isArray(e.criterionRatings) ? e.criterionRatings : []);
  const ratingNums = allRatings
    .map((r) => Number(r.rating))
    .filter((n) => Number.isFinite(n) && n > 0);
  const avgRating = ratingNums.length
    ? ratingNums.reduce((sum, n) => sum + n, 0) / ratingNums.length
    : null;

  const coveredSet = new Set<string>();
  for (const r of allRatings) {
    if (r?.criterionId && Number(r.rating) > 0) coveredSet.add(String(r.criterionId));
  }
  const criteriaExpected = activeCriteria.filter((c) => c.active).length;
  const criteriaCovered = coveredSet.size;

  return {
    count,
    avgRating,
    latestRecommendation: sorted[0]?.overallRecommendation || null,
    latestSummary: sorted[0]?.summary ? String(sorted[0].summary) : null,
    criteriaCovered,
    criteriaExpected,
    isComplete: criteriaExpected === 0 ? count > 0 : criteriaCovered >= criteriaExpected,
  };
}

export function waitingOnLabel(input: {
  pipelineStage?: string | null;
  hasEvaluation: boolean;
  isEvaluationComplete: boolean;
  reviewStatus?: string | null;
  awaitingCandidateReply?: boolean;
}): string {
  const reviewStatus = String(input.reviewStatus || "");
  const stage = String(input.pipelineStage || "NEW");

  if (input.awaitingCandidateReply) return "Waiting on candidate reply";
  if (reviewStatus === "REQUESTED") return "Waiting on hiring manager review";
  if (!input.hasEvaluation && (stage === "SHORTLIST" || stage === "INTERVIEW" || stage === "FINALIST" || stage === "OFFER")) {
    return "Waiting on evaluation";
  }
  if (!input.isEvaluationComplete && (stage === "INTERVIEW" || stage === "FINALIST" || stage === "OFFER")) {
    return "Waiting on evaluation completion";
  }
  if (stage === "SHORTLIST" && input.hasEvaluation) return "Ready for compare";
  if (stage === "FINALIST" && (reviewStatus === "SUBMITTED" || reviewStatus === "APPROVED")) {
    return "Ready for interview decision";
  }
  if (stage === "OFFER") return "Offer in progress";
  if (stage === "HIRED") return "Hired";
  if (stage === "NEW") return "Waiting on recruiter outreach";
  return "In progress";
}
