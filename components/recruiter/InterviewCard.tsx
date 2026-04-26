"use client";

import type { InterviewEvent } from "@/lib/communication-workflow";
import InterviewStatusBadge from "@/components/recruiter/InterviewStatusBadge";

type Props = {
  interview: InterviewEvent;
  onReschedule?: (interview: InterviewEvent) => void;
  onCancel?: (interview: InterviewEvent) => void;
  onComplete?: (interview: InterviewEvent) => void;
  onRetrySync?: (interview: InterviewEvent) => void;
  onCandidateResponse?: (interview: InterviewEvent, response: "ACCEPTED" | "DECLINED" | "REQUEST_RESCHEDULE") => void;
};

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

export default function InterviewCard({
  interview,
  onReschedule,
  onCancel,
  onComplete,
  onRetrySync,
  onCandidateResponse,
}: Props) {
  const when = toDate(interview.scheduledAt);
  const location =
    typeof interview.location === "string"
      ? interview.location
      : `${String(interview.location?.type || "VIDEO").replace("_", " ")}: ${String(interview.location?.value || "-")}`;
  const providerLabel =
    String(interview.calendarProvider || "").toLowerCase() === "microsoft" ? "Outlook Calendar" : "Google Calendar";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{interview.title || "Interview"}</p>
          <p className="text-xs text-slate-600">{String(interview.type || "VIDEO").replace("_", " ")} • {interview.durationMinutes} min</p>
        </div>
        <InterviewStatusBadge status={interview.status} />
      </div>
      <p className="mt-2 text-xs text-slate-700">{when ? when.toLocaleString() : "Time not set"} {interview.timezone ? `(${interview.timezone})` : ""}</p>
      <p className="mt-1 text-xs text-slate-600">{location}</p>
      <p className="mt-1 text-xs text-slate-600">Candidate response: {String(interview.candidateResponse || "PENDING").replace("_", " ").toLowerCase()}</p>
      <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs">
        {interview.calendarSyncStatus === "SYNCED" ? (
          <p className="text-emerald-700">{providerLabel} synced</p>
        ) : interview.calendarSyncStatus === "FAILED" ? (
          <div className="flex items-center gap-2">
            <p className="text-rose-700">{providerLabel} sync failed</p>
            {onRetrySync ? (
              <button
                type="button"
                onClick={() => onRetrySync(interview)}
                className="rounded border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
              >
                Retry calendar sync
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-slate-500">Not synced to external calendar</p>
        )}
        {interview.calendarHtmlLink && (
          <a href={interview.calendarHtmlLink} target="_blank" rel="noreferrer" className="text-sky-700 underline">
            {providerLabel === "Outlook Calendar" ? "Open in Outlook Calendar" : "Open in Google Calendar"}
          </a>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onReschedule?.(interview)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">Reschedule interview</button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Cancel this interview? This will also cancel the calendar event if synced.")) return;
            onCancel?.(interview);
          }}
          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700"
        >
          Cancel interview
        </button>
        <button type="button" onClick={() => onComplete?.(interview)} className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">Mark as completed</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onCandidateResponse?.(interview, "ACCEPTED")} className="rounded-lg border border-sky-200 px-2 py-1 text-[11px] text-sky-800">Confirmed</button>
        <button type="button" onClick={() => onCandidateResponse?.(interview, "DECLINED")} className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] text-rose-700">Declined</button>
        <button type="button" onClick={() => onCandidateResponse?.(interview, "REQUEST_RESCHEDULE")} className="rounded-lg border border-amber-200 px-2 py-1 text-[11px] text-amber-800">Requested reschedule</button>
      </div>
    </div>
  );
}
