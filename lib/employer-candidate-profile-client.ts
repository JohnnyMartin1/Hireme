/** Server-backed employer view of a candidate (field-masked; uses Admin read). */
export async function fetchEmployerCandidateProfile(
  candidateId: string,
  idToken: string,
  context?: { jobId?: string | null; threadId?: string | null; poolId?: string | null }
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  try {
    const params = new URLSearchParams();
    if (context?.jobId) params.set("jobId", context.jobId);
    if (context?.threadId) params.set("threadId", context.threadId);
    if (context?.poolId) params.set("poolId", context.poolId);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/employer/candidate-profile/${encodeURIComponent(candidateId)}${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 404) {
      return { data: null, error: "Not found" };
    }
    if (!res.ok) {
      return { data: null, error: "Failed to load profile" };
    }
    const json = (await res.json()) as { profile?: Record<string, unknown> };
    return { data: json.profile ?? null, error: null };
  } catch {
    return { data: null, error: "Failed to load profile" };
  }
}

export async function syncPublicCandidateProfileAfterSave(idToken: string): Promise<void> {
  try {
    await fetch("/api/auth/sync-public-candidate-profile", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
  } catch {
    // non-fatal
  }
}
