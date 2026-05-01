"use client";

import { useEffect, useMemo, useState } from "react";
import type { InterviewPlanRound, ScorecardTemplate } from "@/lib/communication-workflow";
import ScorecardTemplateEditor from "@/components/recruiter/ScorecardTemplateEditor";
import { recruiterBtnGhost, recruiterBtnPrimary, recruiterBtnSecondarySm, recruiterChip } from "@/lib/recruiter-ui";

type Props = {
  rounds: InterviewPlanRound[];
  templates: ScorecardTemplate[];
  onSaveRounds: (rounds: InterviewPlanRound[]) => Promise<void> | void;
  onSaveTemplate: (roundId: string, payload: { title: string; description: string; criteria: any[] }) => Promise<void> | void;
  onArchiveRound?: (roundId: string) => Promise<void> | void;
  teamMembers?: Array<{ id: string; name: string }>;
};

export default function InterviewPlanBuilder({ rounds, templates, onSaveRounds, onSaveTemplate, onArchiveRound, teamMembers = [] }: Props) {
  const [draftRounds, setDraftRounds] = useState<InterviewPlanRound[]>(rounds);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [savingRounds, setSavingRounds] = useState(false);
  useEffect(() => {
    setDraftRounds(rounds);
  }, [rounds]);
  const activeDraftRounds = useMemo(
    () => draftRounds.filter((round) => round.active !== false).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [draftRounds]
  );
  const archivedRounds = useMemo(
    () => draftRounds.filter((round) => round.active === false).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [draftRounds]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Interview rounds</p>
            <p className="text-xs text-slate-500">Define the sequence, defaults, and scorecards used when scheduling.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setDraftRounds((prev) => [
                ...prev,
                {
                  id: `new_${Date.now()}`,
                  planId: "",
                  jobId: "",
                  companyId: "",
                  roundName: "New round",
                  roundType: "CUSTOM",
                  defaultDurationMinutes: 45,
                  order: prev.length,
                  required: true,
                  defaultInterviewerIds: [],
                  active: true,
                },
              ])
            }
            className={`${recruiterBtnPrimary} px-3 py-1.5 text-xs`}
          >
            Add interview round
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {activeDraftRounds.map((round, idx) => (
              <div key={round.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50/40">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <input
                    value={round.roundName}
                    onChange={(e) =>
                      setDraftRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, roundName: e.target.value } : r)))
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm md:col-span-2"
                  />
                  <select
                    value={round.roundType}
                    onChange={(e) =>
                      setDraftRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, roundType: e.target.value as any } : r)))
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                  >
                    <option value="PHONE_SCREEN">Phone screen</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="BEHAVIORAL">Behavioral</option>
                    <option value="PORTFOLIO_REVIEW">Portfolio review</option>
                    <option value="CASE_STUDY">Case study</option>
                    <option value="HIRING_MANAGER">Hiring manager</option>
                    <option value="FINAL_ROUND">Final round</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  <input
                    value={String(round.defaultDurationMinutes || 45)}
                    onChange={(e) =>
                      setDraftRounds((prev) =>
                        prev.map((r) => (r.id === round.id ? { ...r, defaultDurationMinutes: Number(e.target.value || 45) } : r))
                      )
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                  />
                </div>
                <div className="mt-2">
                  <span className={templates.some((t) => t.roundId === round.id) ? recruiterChip.submitted : recruiterChip.optional}>
                    {templates.some((t) => t.roundId === round.id) ? "Scorecard ready" : "Scorecard optional"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setEditingRoundId(round.id)} className={recruiterBtnSecondarySm}>
                    Edit scorecard
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftRounds((prev) =>
                        prev.map((r) => (r.id === round.id ? { ...r, order: Math.max(0, idx - 1) } : r.id === activeDraftRounds[idx - 1]?.id ? { ...r, order: idx } : r))
                      )
                    }
                    className={recruiterBtnGhost}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftRounds((prev) =>
                        prev.map((r) => (r.id === round.id ? { ...r, order: idx + 1 } : r.id === activeDraftRounds[idx + 1]?.id ? { ...r, order: idx } : r))
                      )
                    }
                    className={recruiterBtnGhost}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Archive "${round.roundName}"? It will no longer appear in active scheduling choices.`)) return;
                      if (String(round.id || "").startsWith("new_")) {
                        setDraftRounds((prev) => prev.filter((r) => r.id !== round.id));
                        return;
                      }
                      if (onArchiveRound) {
                        await onArchiveRound(round.id);
                      } else {
                        setDraftRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, active: false } : r)));
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Archive round
                  </button>
                </div>
              </div>
            ))}
        </div>
        {archivedRounds.length > 0 ? (
          <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">Archived rounds ({archivedRounds.length})</summary>
            <div className="mt-2 space-y-2">
              {archivedRounds.map((round) => (
                <div key={round.id} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                  {round.roundName || "Interview round"}
                </div>
              ))}
            </div>
          </details>
        ) : null}
        {activeDraftRounds.length === 0 ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-navy-900">No interview rounds yet</p>
            <p className="mt-1 text-xs text-slate-600">Add your first interview round to start defining scheduling defaults and scorecards.</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            setSavingRounds(true);
            try {
              await onSaveRounds(draftRounds);
            } finally {
              setSavingRounds(false);
            }
          }}
          disabled={savingRounds}
          className={`${recruiterBtnPrimary} mt-3 bg-emerald-700 px-3 py-1.5 text-xs disabled:opacity-60`}
        >
          {savingRounds ? "Saving rounds..." : "Save rounds"}
        </button>
      </div>

      {editingRoundId ? (
        <ScorecardTemplateEditor
          initialTitle={templates.find((t) => t.roundId === editingRoundId)?.title || "Interview scorecard"}
          initialDescription={templates.find((t) => t.roundId === editingRoundId)?.description || ""}
          initialCriteria={templates.find((t) => t.roundId === editingRoundId)?.criteria || []}
          onSave={(payload) => onSaveTemplate(editingRoundId, payload)}
        />
      ) : null}
    </div>
  );
}
