import type {
  CandidateEvaluation,
  CandidateReviewRequest,
  JobEvaluationCriterion,
} from "@/lib/hiring-decision";

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
  if (!res.ok) {
    return { ok: false, error: String(payload?.error || "Request failed"), data: {} as T };
  }
  return { ok: true, error: null, data: payload as T };
}

export async function fetchJobEvaluationCriteria(jobId: string, token: string) {
  return authedFetch<{ criteria: JobEvaluationCriterion[] }>(`/api/job/${encodeURIComponent(jobId)}/evaluation-criteria`, token);
}

export async function saveJobEvaluationCriteria(
  jobId: string,
  criteria: JobEvaluationCriterion[],
  token: string
) {
  return authedFetch<{ criteria: JobEvaluationCriterion[] }>(
    `/api/job/${encodeURIComponent(jobId)}/evaluation-criteria`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ criteria }),
    }
  );
}

export async function fetchJobEvaluations(jobId: string, token: string, candidateId?: string | null) {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
  return authedFetch<{ evaluations: CandidateEvaluation[] }>(`/api/job/${encodeURIComponent(jobId)}/evaluations${q}`, token);
}

export async function saveCandidateEvaluation(
  jobId: string,
  body: Record<string, unknown>,
  token: string
) {
  return authedFetch<{ evaluation: CandidateEvaluation }>(
    `/api/job/${encodeURIComponent(jobId)}/evaluations`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function fetchJobReviews(jobId: string, token: string, candidateId?: string | null) {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
  return authedFetch<{ reviews: CandidateReviewRequest[] }>(`/api/job/${encodeURIComponent(jobId)}/reviews${q}`, token);
}

export async function upsertCandidateReview(
  jobId: string,
  body: Record<string, unknown>,
  token: string
) {
  return authedFetch<{ review: CandidateReviewRequest }>(
    `/api/job/${encodeURIComponent(jobId)}/reviews`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}
