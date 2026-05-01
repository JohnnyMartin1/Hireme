/** Server-backed employer view of a candidate (field-masked; uses Admin read). */
export async function fetchEmployerCandidateProfile(
  candidateId: string,
  idToken: string
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  try {
    const res = await fetch(`/api/employer/candidate-profile/${encodeURIComponent(candidateId)}`, {
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
