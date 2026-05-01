"use client";

import { useMemo, useState } from "react";
import type { ScorecardCriterion } from "@/lib/communication-workflow";
import { recruiterBtnGhost, recruiterBtnPrimary, recruiterBtnSecondarySm, recruiterChip } from "@/lib/recruiter-ui";

const DEFAULT_SUGGESTIONS = [
  "Communication",
  "Role fit",
  "Technical ability",
  "Problem solving",
  "Motivation",
  "Culture/team fit",
  "Experience relevance",
];

type Props = {
  initialTitle?: string;
  initialDescription?: string | null;
  initialCriteria?: ScorecardCriterion[];
  onSave: (payload: {
    title: string;
    description: string;
    criteria: ScorecardCriterion[];
  }) => Promise<void> | void;
  busy?: boolean;
};

export default function ScorecardTemplateEditor({ initialTitle, initialDescription, initialCriteria, onSave, busy }: Props) {
  const [title, setTitle] = useState(initialTitle || "Interview scorecard");
  const [description, setDescription] = useState(initialDescription || "");
  const [criteria, setCriteria] = useState<ScorecardCriterion[]>(
    initialCriteria?.length
      ? initialCriteria
      : DEFAULT_SUGGESTIONS.slice(0, 5).map((label, idx) => ({
          id: `criterion_${idx + 1}`,
          label,
          description: "",
          ratingScale: "ONE_TO_FIVE",
          required: true,
          order: idx,
        }))
  );
  const sorted = useMemo(() => [...criteria].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)), [criteria]);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Scorecard template</p>
          <p className="text-xs text-slate-500">Required criteria are enforced on submit.</p>
        </div>
        <button type="button" onClick={() => setShowPreview((p) => !p)} className={recruiterBtnSecondarySm}>
          {showPreview ? "Edit mode" : "Preview"}
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Template title" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="What should interviewers focus on?" />
      </div>
      {!showPreview ? <div className="mt-4 space-y-2">
        {sorted.map((criterion, idx) => (
          <div key={criterion.id} className="rounded-lg border border-slate-200 p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                value={criterion.label}
                onChange={(e) =>
                  setCriteria((prev) =>
                    prev.map((c) => (c.id === criterion.id ? { ...c, label: e.target.value } : c))
                  )
                }
                className="rounded-md border border-slate-200 px-2 py-1 text-sm md:col-span-2"
                placeholder="Criterion label"
              />
              <input
                value={criterion.description || ""}
                onChange={(e) =>
                  setCriteria((prev) =>
                    prev.map((c) => (c.id === criterion.id ? { ...c, description: e.target.value } : c))
                  )
                }
                className="rounded-md border border-slate-200 px-2 py-1 text-sm md:col-span-2"
                placeholder="What should interviewer evaluate?"
              />
              <select
                value={criterion.ratingScale}
                onChange={(e) =>
                  setCriteria((prev) =>
                    prev.map((c) => (c.id === criterion.id ? { ...c, ratingScale: e.target.value as any } : c))
                  )
                }
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                <option value="YES_NO">Yes / No</option>
                <option value="ONE_TO_FIVE">1 to 5</option>
                <option value="ONE_TO_FOUR">1 to 4</option>
                <option value="TEXT">Text only</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={criterion.required}
                  onChange={(e) =>
                    setCriteria((prev) =>
                      prev.map((c) => (c.id === criterion.id ? { ...c, required: e.target.checked } : c))
                    )
                  }
                />
                <span className={criterion.required ? recruiterChip.required : recruiterChip.optional}>
                  {criterion.required ? "Required" : "Optional"}
                </span>
              </label>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCriteria((prev) =>
                    prev.map((c) => (c.id === criterion.id ? { ...c, order: Math.max(0, idx - 1) } : c.id === sorted[idx - 1]?.id ? { ...c, order: idx } : c))
                  )
                }
                className={recruiterBtnGhost}
              >
                Up
              </button>
              <button
                type="button"
                onClick={() =>
                  setCriteria((prev) =>
                    prev.map((c) => (c.id === criterion.id ? { ...c, order: idx + 1 } : c.id === sorted[idx + 1]?.id ? { ...c, order: idx } : c))
                  )
                }
                className={recruiterBtnGhost}
              >
                Down
              </button>
              <button
                type="button"
                onClick={() =>
                  setCriteria((prev) =>
                    prev
                      .filter((c) => c.id !== criterion.id)
                      .map((c, order) => ({ ...c, order }))
                  )
                }
                className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-navy-900">No scorecard criteria yet</p>
            <p className="mt-1 text-xs text-slate-600">Add criteria so interviewers can give structured feedback.</p>
          </div>
        ) : null}
      </div> : (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">{title || "Interview scorecard"}</p>
          <p className="mt-1 text-xs text-slate-600">{description || "No description added yet."}</p>
          <div className="mt-3 space-y-2">
            {sorted.map((criterion) => (
              <div key={criterion.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">
                  {criterion.label || "Untitled criterion"} {criterion.required ? <span className="text-rose-600">*</span> : null}
                </p>
                <p className="text-[11px] text-slate-500">{criterion.description || "No description"}</p>
                <p className="text-[11px] text-slate-500">Scale: {String(criterion.ratingScale || "ONE_TO_FIVE").replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setCriteria((prev) => [
              ...prev,
              {
                id: `criterion_${Date.now()}`,
                label: "",
                description: "",
                ratingScale: "ONE_TO_FIVE",
                required: true,
                order: prev.length,
              },
            ])
          }
          className={recruiterBtnSecondarySm}
        >
          Add criterion
        </button>
        <button
          type="button"
          onClick={() => onSave({ title: title.trim(), description: description.trim(), criteria: sorted })}
          disabled={busy}
          className={`${recruiterBtnPrimary} px-3 py-1.5 text-xs disabled:opacity-60`}
        >
          {busy ? "Saving..." : "Save scorecard"}
        </button>
      </div>
    </div>
  );
}
