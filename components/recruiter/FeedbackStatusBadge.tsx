"use client";

type Props = {
  status: "REQUESTED" | "IN_PROGRESS" | "SUBMITTED" | "WAIVED" | "MISSING";
};

const LABELS: Record<Props["status"], string> = {
  REQUESTED: "Feedback requested",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  WAIVED: "Waived",
  MISSING: "Missing",
};

const STYLES: Record<Props["status"], string> = {
  REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
  SUBMITTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WAIVED: "bg-slate-100 text-slate-600 border-slate-200",
  MISSING: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function FeedbackStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
