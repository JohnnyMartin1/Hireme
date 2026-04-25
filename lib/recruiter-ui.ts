/**
 * Recruiter-facing UI helpers — display strings and shared Tailwind class tokens.
 * Pipeline API values are unchanged; labels are for presentation only.
 */

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  SHORTLIST: "Shortlisted",
  CONTACTED: "Contacted",
  RESPONDED: "Responded",
  INTERVIEW: "Interview",
  FINALIST: "Finalist",
  REJECTED: "Rejected",
  NOT_IN_PIPELINE: "Not in pipeline",
};

/** Human-readable pipeline stage for column headers, badges, and select labels. */
export function pipelineStageLabel(stage: string | undefined | null): string {
  if (stage == null || stage === "") return "—";
  const key = String(stage).toUpperCase().trim();
  if (PIPELINE_STAGE_LABELS[key]) return PIPELINE_STAGE_LABELS[key];
  return key
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Primary CTA — navy fill (no arbitrary shadows / scale). */
export const recruiterBtnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50 disabled:pointer-events-none";

export const recruiterBtnPrimaryLg =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-6 py-3 text-base font-semibold text-white hover:bg-navy-700 disabled:opacity-50";

/** Secondary — outlined navy. */
export const recruiterBtnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-navy-800 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50 disabled:opacity-50";

export const recruiterBtnSecondarySm =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-navy-800 bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-50 disabled:opacity-50";

/** Ghost — text + subtle hover. */
export const recruiterBtnGhost =
  "inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900 disabled:opacity-50";

/** Badge semantics: green / amber / slate / rose (recruiter ATS). */
export const recruiterBadge = {
  positive: "border border-green-200 bg-green-50 text-green-900",
  pending: "border border-amber-200 bg-amber-50 text-amber-950",
  inactive: "border border-slate-200 bg-slate-50 text-slate-600",
  urgent: "border border-rose-200 bg-rose-50 text-rose-900",
  neutral: "border border-slate-200 bg-white text-slate-700",
} as const;
