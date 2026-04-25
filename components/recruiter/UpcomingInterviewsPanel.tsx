"use client";

import type { InterviewEvent } from "@/lib/communication-workflow";
import InterviewStatusBadge from "@/components/recruiter/InterviewStatusBadge";

function toDate(value: unknown): Date | null {
  const v: any = value;
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function UpcomingInterviewsPanel({
  interviews,
}: {
  interviews: Array<InterviewEvent & { candidateName?: string; jobTitle?: string }>;
}) {
  const rows = interviews
    .filter((x) => x.status !== "CANCELLED" && x.status !== "COMPLETED")
    .sort((a, b) => (toDate(a.scheduledAt)?.getTime() || 0) - (toDate(b.scheduledAt)?.getTime() || 0))
    .slice(0, 8);
  const now = new Date();
  const today = rows.filter((x) => {
    const d = toDate(x.scheduledAt);
    return d && d.toDateString() === now.toDateString();
  }).length;
  const tomorrow = rows.filter((x) => {
    const d = toDate(x.scheduledAt);
    if (!d) return false;
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    return d.toDateString() === t.toDateString();
  }).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Upcoming interviews</h3>
        <p className="text-xs text-slate-600">Today {today} · Tomorrow {tomorrow}</p>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming interviews.</p>
        ) : (
          rows.map((iv) => (
            <div key={iv.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{iv.candidateName || "Candidate"} · {iv.jobTitle || "Job"}</p>
                <InterviewStatusBadge status={iv.status} />
              </div>
              <p className="text-xs text-slate-600 mt-0.5">{toDate(iv.scheduledAt)?.toLocaleString() || "Unscheduled"} {iv.timezone ? `(${iv.timezone})` : ""}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
