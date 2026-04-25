"use client";

export default function InterviewStatusBadge({ status }: { status?: string | null }) {
  const s = String(status || "PROPOSED").toUpperCase();
  const cls =
    s === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : s === "CANCELLED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : s === "CONFIRMED"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : s === "RESCHEDULE_REQUESTED"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-slate-200 bg-slate-50 text-slate-700";
  const label =
    s === "RESCHEDULE_REQUESTED"
      ? "Needs reschedule"
      : s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ");
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}
