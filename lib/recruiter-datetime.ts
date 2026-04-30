/**
 * Resilient parsing/formatting for Firestore Timestamps, ISO strings, millis, and legacy shapes.
 * Avoids user-facing "Invalid Date" from Date.prototype.toLocaleString on bad inputs.
 */

export function parseFlexibleDateTime(value: unknown): Date | null {
  const v: any = value;
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v?._seconds === "number") {
    const ns = typeof v._nanoseconds === "number" ? v._nanoseconds / 1e6 : 0;
    const d = new Date(v._seconds * 1000 + ns);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v?.seconds === "number") {
    const ns = typeof v.nanoseconds === "number" ? v.nanoseconds / 1e6 : 0;
    const d = new Date(v.seconds * 1000 + ns);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatRecruiterDateTime(
  value: unknown,
  opts?: { placeholder?: string; timeZone?: string }
): string {
  const ph = opts?.placeholder ?? "Interview date not set";
  const d = parseFlexibleDateTime(value);
  if (!d) return ph;
  try {
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      ...(opts?.timeZone ? { timeZone: opts.timeZone } : {}),
    });
  } catch {
    return ph;
  }
}

/** When a field is present but not parseable, treat as TBD rather than invalid. */
export function formatInterviewWhenLabel(value: unknown): string {
  const v: any = value;
  if (v == null || v === "") return "Interview date not set";
  if (typeof v === "object" && !Array.isArray(v) && v && typeof v.toDate !== "function" && Object.keys(v).length === 0) {
    return "Interview date not set";
  }
  const d = parseFlexibleDateTime(value);
  if (!d) return "Interview scheduled";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
