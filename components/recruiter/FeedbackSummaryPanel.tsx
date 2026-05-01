"use client";

import type { InterviewFeedback } from "@/lib/communication-workflow";

type Props = {
  feedback: InterviewFeedback[];
};

export default function FeedbackSummaryPanel({ feedback }: Props) {
  const requested = feedback.length;
  const submitted = feedback.filter((f) => f.status === "SUBMITTED").length;
  const missing = feedback.filter((f) => f.status !== "SUBMITTED" && f.status !== "WAIVED").length;
  const recCounts = feedback.reduce(
    (acc, f) => {
      const key = String(f.overallRecommendation || "");
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">Feedback summary</p>
      <div className="mt-2 text-xs text-slate-600">
        <p>Requested: {requested}</p>
        <p>Submitted: {submitted}</p>
        <p>Missing: {missing}</p>
      </div>
      <div className="mt-2 text-xs text-slate-600">
        {Object.keys(recCounts).length === 0 ? (
          <p>No recommendations yet.</p>
        ) : (
          Object.entries(recCounts).map(([k, v]) => (
            <p key={k}>
              {k.replaceAll("_", " ")}: {v}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
