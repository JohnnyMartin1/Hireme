import type {
  InterviewEvent,
  MessageTemplate,
  OutreachSequence,
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
