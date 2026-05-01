"use client";

import { useEffect, useState } from "react";
import type { CandidateDebrief } from "@/lib/communication-workflow";

type Props = {
  debrief: CandidateDebrief | null;
  missingFeedbackCount: number;
  onSave: (payload: Record<string, unknown>) => Promise<void> | void;
  busy?: boolean;
};

export default function CandidateDebriefPanel({ debrief, missingFeedbackCount, onSave, busy }: Props) {
  const [decision, setDecision] = useState(String(debrief?.decision || ""));
  const [decisionReason, setDecisionReason] = useState(String(debrief?.decisionReason || ""));
  const [feedbackSummary, setFeedbackSummary] = useState(String(debrief?.feedbackSummary || ""));
  const [overrideMissingFeedback, setOverrideMissingFeedback] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  useEffect(() => {
    setDecision(String(debrief?.decision || ""));
    setDecisionReason(String(debrief?.decisionReason || ""));
    setFeedbackSummary(String(debrief?.feedbackSummary || ""));
    setOverrideMissingFeedback(Boolean((debrief as any)?.overrideMissingFeedback));
    setOverrideReason(String((debrief as any)?.missingFeedbackOverrideReason || ""));
  }, [debrief]);
  const missingFeedbackBlocked = missingFeedbackCount > 0 && !overrideMissingFeedback;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">Candidate debrief</p>
      {missingFeedbackCount > 0 ? (
        <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-800">
          <p>Missing feedback from {missingFeedbackCount} interviewer(s).</p>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={overrideMissingFeedback}
              onChange={(e) => setOverrideMissingFeedback(e.target.checked)}
            />
            Continue anyway with override
          </label>
          {overrideMissingFeedback ? (
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="mt-2 w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-xs"
              placeholder="Override reason (required)"
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-1 text-xs text-emerald-700">Ready for debrief.</p>
      )}
      <textarea
        value={feedbackSummary}
        onChange={(e) => setFeedbackSummary(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        placeholder="Debrief notes"
      />
      <select value={decision} onChange={(e) => setDecision(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
        <option value="">Select decision</option>
        <option value="ADVANCE">Advance</option>
        <option value="FINALIST">Move to finalist</option>
        <option value="REJECT">Reject</option>
        <option value="HOLD">Hold</option>
        <option value="NEEDS_MORE_SIGNAL">Needs more signal</option>
      </select>
      <textarea
        value={decisionReason}
        onChange={(e) => setDecisionReason(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        placeholder="Decision reason"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave({ status: "IN_PROGRESS", feedbackSummary, decision, decisionReason })}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold"
        >
          Save debrief
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              status: "COMPLETED",
              feedbackSummary,
              decision,
              decisionReason,
              updatePipelineStage: true,
              overrideMissingFeedback,
              missingFeedbackOverrideReason: overrideMissingFeedback ? overrideReason : null,
            })
          }
          disabled={busy || !decision || missingFeedbackBlocked || (overrideMissingFeedback && !overrideReason.trim())}
          className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Complete decision
        </button>
      </div>
    </div>
  );
}
