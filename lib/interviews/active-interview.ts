type InterviewLike = {
  id?: string;
  status?: string | null;
  scheduledAt?: unknown;
  updatedAt?: unknown;
};

function toMillis(value: unknown): number | null {
  const v: any = value;
  if (!v) return null;
  if (typeof v.toDate === "function") {
    const d = v.toDate();
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof v._seconds === "number") return v._seconds * 1000;
  if (typeof v.seconds === "number") return v.seconds * 1000;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function selectActiveInterview<T extends InterviewLike>(
  interviews: T[],
  nowMs: number = Date.now()
): { interview: T | null; ambiguous: boolean; reason: string } {
  const nonCancelled = interviews.filter((iv) => String(iv.status || "").toUpperCase() !== "CANCELLED");
  if (nonCancelled.length === 0) return { interview: null, ambiguous: false, reason: "no_non_cancelled" };

  const nonCompleted = nonCancelled.filter((iv) => String(iv.status || "").toUpperCase() !== "COMPLETED");
  const pool = nonCompleted.length > 0 ? nonCompleted : nonCancelled;

  const future = pool
    .map((iv) => ({ iv, at: toMillis(iv.scheduledAt) }))
    .filter((x) => x.at != null && (x.at as number) >= nowMs) as Array<{ iv: T; at: number }>;

  if (future.length > 0) {
    future.sort((a, b) => {
      const da = a.at - nowMs;
      const db = b.at - nowMs;
      return da - db;
    });
    const best = future[0];
    const tied = future.filter((x) => x.at === best.at);
    if (tied.length > 1) return { interview: null, ambiguous: true, reason: "ambiguous_future_scheduled_at" };
    return { interview: best.iv, ambiguous: false, reason: "future_closest" };
  }

  const ranked = pool
    .map((iv) => ({
      iv,
      updatedAtMs: toMillis(iv.updatedAt) ?? -1,
      scheduledAtMs: toMillis(iv.scheduledAt) ?? -1,
    }))
    .sort((a, b) => {
      if (b.updatedAtMs !== a.updatedAtMs) return b.updatedAtMs - a.updatedAtMs;
      return b.scheduledAtMs - a.scheduledAtMs;
    });

  const best = ranked[0];
  const tied = ranked.filter(
    (x) => x.updatedAtMs === best.updatedAtMs && x.scheduledAtMs === best.scheduledAtMs
  );
  if (tied.length > 1) return { interview: null, ambiguous: true, reason: "ambiguous_recent_update" };
  return { interview: best.iv, ambiguous: false, reason: "most_recent_update" };
}
