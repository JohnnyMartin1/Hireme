"use client";

import FeedbackStatusBadge from "@/components/recruiter/FeedbackStatusBadge";

type Props = {
  roundName?: string | null;
  roundType?: string | null;
  roundStatus?: string | null;
  feedbackStatus?: "REQUESTED" | "IN_PROGRESS" | "SUBMITTED" | "WAIVED" | "MISSING" | null;
};

export default function InterviewRoundBadge({ roundName, roundType, roundStatus, feedbackStatus }: Props) {
  const safeRoundName = String(roundName || "").trim();
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
      <span className="font-semibold text-slate-700">{safeRoundName || "Interview round"}</span>
      <span className="text-slate-500">{roundType ? String(roundType).replaceAll("_", " ") : "CUSTOM"}</span>
      {roundStatus ? <span className="text-slate-500">• {roundStatus}</span> : null}
      {feedbackStatus ? <FeedbackStatusBadge status={feedbackStatus} /> : null}
    </div>
  );
}
