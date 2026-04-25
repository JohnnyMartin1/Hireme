export type ReviewAssignmentStatus = "REQUESTED" | "VIEWED" | "COMPLETED" | "DECLINED";
export type ReviewAssignmentPriority = "LOW" | "NORMAL" | "HIGH";
export type ReviewDecision = "STRONG_YES" | "YES" | "MIXED" | "NO" | "HOLD" | null;

export interface CandidateReviewAssignment {
  id: string;
  companyId: string;
  jobId: string;
  candidateId: string;
  requestedByUserId: string;
  assignedToUserId: string;
  status: ReviewAssignmentStatus;
  priority: ReviewAssignmentPriority;
  message?: string | null;
  decision?: ReviewDecision;
  feedbackSummary?: string | null;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
}

export interface CandidateInternalComment {
  id: string;
  companyId: string;
  jobId: string;
  candidateId: string;
  authorUserId: string;
  body: string;
  mentions?: string[];
  createdAt?: any;
  updatedAt?: any;
  deletedAt?: any;
  parentCommentId?: string | null;
}

export interface TeamMemberOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
  title?: string;
}

export const REVIEW_DECISION_OPTIONS: { value: Exclude<ReviewDecision, null>; label: string }[] = [
  { value: "STRONG_YES", label: "Strong yes" },
  { value: "YES", label: "Yes" },
  { value: "MIXED", label: "Mixed" },
  { value: "NO", label: "No" },
  { value: "HOLD", label: "Hold" },
];
