import type {
  CandidateDebrief,
  InterviewFeedback,
  InterviewEvent,
  InterviewPlan,
  InterviewPlanRound,
  MessageTemplate,
  OutreachSequence,
  ScorecardTemplate,
} from "@/lib/communication-workflow";

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

export async function fetchMessageTemplates(token: string) {
  return authedFetch<{ templates: MessageTemplate[] }>("/api/message-templates", token);
}

export async function upsertMessageTemplate(
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ template: MessageTemplate }>("/api/message-templates", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchMessageTemplate(
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ template: MessageTemplate }>("/api/message-templates", token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteMessageTemplate(token: string, id: string) {
  return authedFetch<{ success: boolean }>("/api/message-templates", token, {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

export async function fetchJobSequences(jobId: string, token: string, candidateId?: string | null) {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
  return authedFetch<{ sequences: OutreachSequence[] }>(
    `/api/job/${encodeURIComponent(jobId)}/sequences${q}`,
    token
  );
}

export async function upsertJobSequence(
  jobId: string,
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ sequence: OutreachSequence }>(
    `/api/job/${encodeURIComponent(jobId)}/sequences`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function patchJobSequence(
  jobId: string,
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ sequence: OutreachSequence }>(
    `/api/job/${encodeURIComponent(jobId)}/sequences`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function fetchJobInterviews(jobId: string, token: string, candidateId?: string | null) {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
  return authedFetch<{ interviews: InterviewEvent[] }>(
    `/api/job/${encodeURIComponent(jobId)}/interviews${q}`,
    token
  );
}

export async function upsertJobInterview(
  jobId: string,
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ interview: InterviewEvent }>(
    `/api/job/${encodeURIComponent(jobId)}/interviews`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function patchJobInterview(
  jobId: string,
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ interview: InterviewEvent }>(
    `/api/job/${encodeURIComponent(jobId)}/interviews`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function patchJobInterviewById(
  jobId: string,
  interviewId: string,
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ interview: InterviewEvent }>(
    `/api/job/${encodeURIComponent(jobId)}/interviews/${encodeURIComponent(interviewId)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function retryJobInterviewSync(
  jobId: string,
  interviewId: string,
  token: string
) {
  return authedFetch<{ interview: InterviewEvent }>(
    `/api/job/${encodeURIComponent(jobId)}/interviews/${encodeURIComponent(interviewId)}/retry-sync`,
    token,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function fetchJobInterviewPlan(jobId: string, token: string) {
  return authedFetch<{ plan: InterviewPlan | null; rounds: InterviewPlanRound[]; scorecardTemplates: ScorecardTemplate[] }>(
    `/api/job/${encodeURIComponent(jobId)}/interview-plan`,
    token
  );
}

export async function upsertJobInterviewPlan(jobId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ plan: InterviewPlan }>(`/api/job/${encodeURIComponent(jobId)}/interview-plan`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function upsertInterviewPlanRounds(jobId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ rounds: InterviewPlanRound[] }>(`/api/job/${encodeURIComponent(jobId)}/interview-plan/rounds`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchInterviewPlanRound(jobId: string, roundId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ round: InterviewPlanRound }>(
    `/api/job/${encodeURIComponent(jobId)}/interview-plan/rounds/${encodeURIComponent(roundId)}`,
    token,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function deactivateInterviewPlanRound(jobId: string, roundId: string, token: string) {
  return authedFetch<{ success: boolean }>(
    `/api/job/${encodeURIComponent(jobId)}/interview-plan/rounds/${encodeURIComponent(roundId)}`,
    token,
    { method: "DELETE", body: JSON.stringify({}) }
  );
}

export async function fetchScorecardTemplates(jobId: string, token: string, roundId?: string | null) {
  const q = roundId ? `?roundId=${encodeURIComponent(roundId)}` : "";
  return authedFetch<{ templates: ScorecardTemplate[] }>(
    `/api/job/${encodeURIComponent(jobId)}/scorecard-templates${q}`,
    token
  );
}

export async function upsertScorecardTemplate(jobId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ template: ScorecardTemplate }>(`/api/job/${encodeURIComponent(jobId)}/scorecard-templates`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchScorecardTemplate(
  jobId: string,
  templateId: string,
  token: string,
  body: Record<string, unknown>
) {
  return authedFetch<{ template: ScorecardTemplate }>(
    `/api/job/${encodeURIComponent(jobId)}/scorecard-templates/${encodeURIComponent(templateId)}`,
    token,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function fetchInterviewFeedback(jobId: string, token: string, query?: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) if (v) search.set(k, String(v));
  const qs = search.toString();
  return authedFetch<{ feedback: InterviewFeedback[] }>(
    `/api/job/${encodeURIComponent(jobId)}/feedback${qs ? `?${qs}` : ""}`,
    token
  );
}

export async function upsertInterviewFeedback(jobId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ feedback: InterviewFeedback[] }>(`/api/job/${encodeURIComponent(jobId)}/feedback`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchInterviewFeedback(jobId: string, feedbackId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ feedback: InterviewFeedback }>(
    `/api/job/${encodeURIComponent(jobId)}/feedback/${encodeURIComponent(feedbackId)}`,
    token,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export async function fetchCandidateDebriefs(jobId: string, token: string, candidateId?: string | null) {
  const q = candidateId ? `?candidateId=${encodeURIComponent(candidateId)}` : "";
  return authedFetch<{ debriefs: CandidateDebrief[] }>(`/api/job/${encodeURIComponent(jobId)}/debriefs${q}`, token);
}

export async function upsertCandidateDebrief(jobId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ debrief: CandidateDebrief }>(`/api/job/${encodeURIComponent(jobId)}/debriefs`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchCandidateDebrief(jobId: string, debriefId: string, token: string, body: Record<string, unknown>) {
  return authedFetch<{ debrief: CandidateDebrief }>(
    `/api/job/${encodeURIComponent(jobId)}/debriefs/${encodeURIComponent(debriefId)}`,
    token,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}
