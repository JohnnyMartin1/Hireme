import type { PipelineStage } from "@/lib/firebase-firestore";

/** Keep API client stage union in lockstep with canonical pipeline stages. */
export type PostJobPipelineStage = PipelineStage;

export type PostJobPipelineBody = {
  candidateId: string;
  stage?: PostJobPipelineStage;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
};

export type PostJobPipelineResult = {
  ok: boolean;
  entry: Record<string, unknown> | null;
  error: string | null;
};

/**
 * Canonical client write path for pipeline state (matches POST /api/job/[jobId]/pipeline).
 */
export async function postJobPipeline(
  jobId: string,
  body: PostJobPipelineBody,
  idToken: string
): Promise<PostJobPipelineResult> {
  const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return { ok: false, entry: null, error: String(payload?.error || "Pipeline update failed") };
  }
  const entry = (payload?.entry as Record<string, unknown>) || null;
  if (!entry?.id) {
    return { ok: false, entry: null, error: "Invalid pipeline response" };
  }
  return { ok: true, entry, error: null };
}
