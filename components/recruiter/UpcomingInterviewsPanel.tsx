"use client";

import Link from "next/link";
import type { InterviewEvent } from "@/lib/communication-workflow";
import InterviewStatusBadge from "@/components/recruiter/InterviewStatusBadge";
import { getCandidateUrl, getJobOverviewUrl } from "@/lib/navigation";
import { formatRecruiterDateTime } from "@/lib/recruiter-datetime";

function toDate(value: unknown): Date | null {
  const v: any = value;
  if (!v) return null;
  if (typeof v.toDate === "function") {
    const d = v.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v._seconds === "number") {
    const d = new Date(v._seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v.seconds === "number") {
    const d = new Date(v.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type UpcomingInterviewRow = InterviewEvent & {
  candidateName?: string;
  jobTitle?: string;
  candidateId?: string;
  jobId?: string;
};

export default function UpcomingInterviewsPanel({
  interviews,
}: {
  interviews: UpcomingInterviewRow[];
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
        <p className="text-xs text-slate-600">
          Today {today} · Tomorrow {tomorrow}
        </p>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming interviews.</p>
        ) : (
          rows.map((iv) => {
            const cid = String(iv.candidateId || "").trim();
            const jid = String(iv.jobId || "").trim();
            const profileHref = cid && jid ? getCandidateUrl(cid, jid) : null;
            const rescheduleHref =
              cid && jid && iv.id
                ? `${getCandidateUrl(cid, jid)}&action=reschedule&interviewId=${encodeURIComponent(iv.id)}`
                : null;
            const whenLabel = formatRecruiterDateTime(iv.scheduledAt, {
              placeholder: "Interview date not set",
            });

            return (
              <div
                key={iv.id}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition-colors hover:border-slate-200 hover:bg-white"
              >
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {iv.candidateName || "Candidate"} · {iv.jobTitle || "Job"}
                      </p>
                      <InterviewStatusBadge status={iv.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {whenLabel}
                      {iv.timezone ? ` (${iv.timezone})` : ""}
                    </p>
                  </Link>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {iv.candidateName || "Candidate"} · {iv.jobTitle || "Job"}
                      </p>
                      <InterviewStatusBadge status={iv.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {whenLabel}
                      {iv.timezone ? ` (${iv.timezone})` : ""}
                    </p>
                  </>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold">
                  <span className="text-slate-500">
                    {iv.calendarProvider === "microsoft" ? "Outlook" : "Google"}:{" "}
                    {iv.calendarSyncStatus === "SYNCED"
                      ? "Synced"
                      : iv.calendarSyncStatus === "FAILED"
                        ? "Sync failed"
                        : "Not synced"}
                  </span>
                  {iv.calendarHtmlLink ? (
                    <a href={iv.calendarHtmlLink} target="_blank" rel="noreferrer" className="text-sky-700 underline">
                      Open calendar
                    </a>
                  ) : null}
                  {profileHref ? (
                    <Link href={profileHref} className="text-navy-800 underline">
                      View candidate
                    </Link>
                  ) : null}
                  {jid ? (
                    <Link href={getJobOverviewUrl(jid)} className="text-navy-800 underline">
                      View job
                    </Link>
                  ) : null}
                  {rescheduleHref ? (
                    <Link href={rescheduleHref} className="text-navy-800 underline">
                      Reschedule
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
