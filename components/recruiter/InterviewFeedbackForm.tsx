"use client";

import { useMemo, useState } from "react";
import type { InterviewFeedback, ScorecardTemplate } from "@/lib/communication-workflow";
import { recruiterBtnPrimary, recruiterBtnSecondary, recruiterChip } from "@/lib/recruiter-ui";

type Props = {
  template: ScorecardTemplate | null;
  feedback: InterviewFeedback | null;
  onSaveDraft: (payload: Record<string, unknown>) => Promise<void> | void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
  busy?: boolean;
};

export default function InterviewFeedbackForm({ template, feedback, onSaveDraft, onSubmit, busy }: Props) {
  const [ratings, setRatings] = useState<Array<{ criterionId: string; rating: string; comment?: string | null }>>(feedback?.ratings || []);
  const [strengths, setStrengths] = useState(String(feedback?.strengths || ""));
  const [concerns, setConcerns] = useState(String(feedback?.concerns || ""));
  const [summary, setSummary] = useState(String(feedback?.summary || ""));
  const [overallRecommendation, setOverallRecommendation] = useState(String(feedback?.overallRecommendation || ""));
  const [editingSubmitted, setEditingSubmitted] = useState(false);

  const requiredCount = useMemo(() => (template?.criteria || []).filter((c) => c.required).length, [template]);
  const completedRequired = useMemo(
    () =>
      (template?.criteria || []).filter((c) => c.required).filter((c) => ratings.some((r) => r.criterionId === c.id && String(r.rating || "").trim())).length,
    [template, ratings]
  );

  if (!template) {
    return <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">No scorecard template attached yet.</div>;
  }
  const isSubmitted = String(feedback?.status || "").toUpperCase() === "SUBMITTED";
  const readOnly = isSubmitted && !editingSubmitted;

  if (readOnly) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-emerald-800">Feedback submitted</p>
          <button type="button" onClick={() => setEditingSubmitted(true)} className={`${recruiterBtnSecondary} px-2 py-1 text-xs`}>
            Edit feedback
          </button>
        </div>
        <p className="mt-1 text-xs text-emerald-700">Your submitted scorecard is locked to avoid accidental edits.</p>
        <div className="mt-3 space-y-2 text-xs text-slate-700">
          <p><span className="font-semibold">Recommendation:</span> {overallRecommendation || "Not set"}</p>
          <p><span className="font-semibold">Strengths:</span> {strengths || "—"}</p>
          <p><span className="font-semibold">Concerns:</span> {concerns || "—"}</p>
          <p><span className="font-semibold">Summary:</span> {summary || "—"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{template.title}</p>
        <p className="text-xs text-slate-500">
          {completedRequired} of {requiredCount} required fields completed
        </p>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-navy-800" style={{ width: `${requiredCount === 0 ? 100 : Math.min(100, Math.round((completedRequired / requiredCount) * 100))}%` }} />
      </div>
      <div className="mt-3 space-y-3">
        {template.criteria
          .slice()
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
          .map((criterion) => (
            <div key={criterion.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">
                {criterion.label} {criterion.required ? <span className="text-rose-600">*</span> : null}
              </p>
              <div className="mt-1">
                <span className={criterion.required ? recruiterChip.required : recruiterChip.optional}>
                  {criterion.required ? "Required" : "Optional"}
                </span>
              </div>
              <input
                type="hidden"
                value={ratings.find((r) => r.criterionId === criterion.id)?.rating || ""}
              />
              {criterion.ratingScale === "ONE_TO_FIVE" || criterion.ratingScale === "ONE_TO_FOUR" || criterion.ratingScale === "YES_NO" ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(criterion.ratingScale === "YES_NO" ? ["YES", "NO"] : Array.from({ length: criterion.ratingScale === "ONE_TO_FOUR" ? 4 : 5 }, (_, i) => String(i + 1))).map((value) => {
                    const active = (ratings.find((r) => r.criterionId === criterion.id)?.rating || "") === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setRatings((prev) => {
                            const next = prev.filter((r) => r.criterionId !== criterion.id);
                            next.push({ criterionId: criterion.id, rating: value, comment: prev.find((r) => r.criterionId === criterion.id)?.comment || "" });
                            return next;
                          })
                        }
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${active ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={ratings.find((r) => r.criterionId === criterion.id)?.rating || ""}
                  onChange={(e) =>
                    setRatings((prev) => {
                      const next = prev.filter((r) => r.criterionId !== criterion.id);
                      next.push({ criterionId: criterion.id, rating: e.target.value, comment: prev.find((r) => r.criterionId === criterion.id)?.comment || "" });
                      return next;
                    })
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                  placeholder="Write your assessment"
                />
              )}
              <textarea
                value={ratings.find((r) => r.criterionId === criterion.id)?.comment || ""}
                onChange={(e) =>
                  setRatings((prev) => {
                    const current = prev.find((r) => r.criterionId === criterion.id);
                    const next = prev.filter((r) => r.criterionId !== criterion.id);
                    next.push({ criterionId: criterion.id, rating: current?.rating || "", comment: e.target.value });
                    return next;
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                placeholder="Comment"
              />
            </div>
          ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Strengths" />
        <textarea value={concerns} onChange={(e) => setConcerns(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Concerns" />
      </div>
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Overall summary" />
      <select value={overallRecommendation} onChange={(e) => setOverallRecommendation(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
        <option value="">Overall recommendation</option>
        <option value="STRONG_YES">Strong yes</option>
        <option value="YES">Yes</option>
        <option value="MIXED">Mixed</option>
        <option value="NO">No</option>
        <option value="HOLD">Hold</option>
      </select>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onSaveDraft({ status: "IN_PROGRESS", ratings, strengths, concerns, summary, overallRecommendation })}
          disabled={busy}
          className={`${recruiterBtnSecondary} px-3 py-1.5 text-xs`}
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={busy || completedRequired < requiredCount}
          onClick={() => onSubmit({ status: "SUBMITTED", ratings, strengths, concerns, summary, overallRecommendation })}
          className={`${recruiterBtnPrimary} px-3 py-1.5 text-xs disabled:opacity-60`}
        >
          Submit feedback
        </button>
      </div>
    </div>
  );
}
