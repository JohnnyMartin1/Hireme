/**
 * Canonical identity for candidatePipelineEntries: one document per job + candidate.
 * Must stay in sync with app/api/job/[jobId]/pipeline/route.ts POST handler.
 */
export function canonicalPipelineEntryId(jobId: string, candidateId: string): string {
  return `job_${jobId}__candidate_${candidateId}`;
}

function timestampMs(value: unknown): number {
  if (!value) return 0;
  const v = value as { toDate?: () => Date; _seconds?: number };
  if (typeof v.toDate === "function") {
    const d = v.toDate();
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  }
  if (typeof v._seconds === "number") return v._seconds * 1000;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export type PipelineEntryLike = {
  id: string;
  jobId: string;
  candidateId: string;
  updatedAt?: unknown;
  createdAt?: unknown;
};

/**
 * Collapse duplicate Firestore rows for the same jobId + candidateId.
 * Prefers the deterministic canonical document id when present; otherwise the most recently updated row.
 */
export function dedupePipelineEntriesByCandidate<T extends PipelineEntryLike>(entries: T[]): T[] {
  const byCandidate = new Map<string, T[]>();
  for (const e of entries) {
    const cid = String(e.candidateId || "");
    if (!cid) continue;
    const list = byCandidate.get(cid) || [];
    list.push(e);
    byCandidate.set(cid, list);
  }

  const out: T[] = [];
  for (const [candidateId, group] of byCandidate) {
    const jobId = String(group[0]?.jobId || "");
    const wantId = canonicalPipelineEntryId(jobId, candidateId);
    const canonical = group.find((g) => g.id === wantId);
    if (canonical) {
      out.push(canonical);
      continue;
    }
    const sorted = [...group].sort(
      (a, b) => timestampMs(b.updatedAt ?? b.createdAt) - timestampMs(a.updatedAt ?? a.createdAt)
    );
    out.push(sorted[0]);
  }
  return out;
}
