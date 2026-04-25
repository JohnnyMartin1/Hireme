import type {
  CandidateInternalComment,
  CandidateReviewAssignment,
  TeamMemberOption,
} from "@/lib/collaboration";

type ApiResult<T> = {
  ok: boolean;
  error: string | null;
  data: T;
};

async function authedFetch<T>(url: string, token: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return { ok: false, error: String(payload?.error || "Request failed"), data: {} as T };
  return { ok: true, error: null, data: payload as T };
}

export async function fetchCompanyTeamMembers(token: string) {
  return authedFetch<{ members: TeamMemberOption[] }>("/api/company/team-members", token);
}

export async function fetchReviewAssignments(jobId: string, token: string, candidateId?: string) {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
  return authedFetch<{ assignments: CandidateReviewAssignment[] }>(
    `/api/job/${encodeURIComponent(jobId)}/collaboration/review-assignments${q}`,
    token
  );
}

export async function upsertReviewAssignment(jobId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ assignment: CandidateReviewAssignment }>(
    `/api/job/${encodeURIComponent(jobId)}/collaboration/review-assignments`,
    token,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function patchReviewAssignment(jobId: string, assignmentId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ assignment: CandidateReviewAssignment }>(
    `/api/job/${encodeURIComponent(jobId)}/collaboration/review-assignments/${encodeURIComponent(assignmentId)}`,
    token,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function fetchInternalComments(jobId: string, token: string, candidateId: string) {
  return authedFetch<{ comments: CandidateInternalComment[] }>(
    `/api/job/${encodeURIComponent(jobId)}/collaboration/comments?candidateId=${encodeURIComponent(candidateId)}`,
    token
  );
}

export async function createInternalComment(jobId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ comment: CandidateInternalComment }>(
    `/api/job/${encodeURIComponent(jobId)}/collaboration/comments`,
    token,
    { method: "POST", body: JSON.stringify(body) }
  );
}
