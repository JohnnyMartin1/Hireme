"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import InterviewPlanBuilder from "@/components/recruiter/InterviewPlanBuilder";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import {
  deactivateInterviewPlanRound,
  fetchJobInterviewPlan,
  upsertInterviewPlanRounds,
  upsertJobInterviewPlan,
  upsertScorecardTemplate,
} from "@/lib/communication-client";
import type { InterviewPlanRound, ScorecardTemplate } from "@/lib/communication-workflow";
import { recruiterBtnPrimary, recruiterBtnSecondary, recruiterChip } from "@/lib/recruiter-ui";
import { getJobPipelineUrl } from "@/lib/navigation";

export default function JobInterviewPlanPage() {
  const params = useParams();
  const jobId = String(params.id || "");
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [savingBasics, setSavingBasics] = useState(false);
  const [planTitle, setPlanTitle] = useState("Interview plan");
  const [planDescription, setPlanDescription] = useState("");
  const [rounds, setRounds] = useState<InterviewPlanRound[]>([]);
  const [templates, setTemplates] = useState<ScorecardTemplate[]>([]);
  const [initialPlanTitle, setInitialPlanTitle] = useState("Interview plan");
  const [initialPlanDescription, setInitialPlanDescription] = useState("");

  const reload = async () => {
    if (!user || !jobId) return;
    setLoading(true);
    const token = await user.getIdToken();
    const res = await fetchJobInterviewPlan(jobId, token);
    if (res.ok) {
      const nextTitle = String(res.data.plan?.title || "Interview plan");
      const nextDescription = String(res.data.plan?.description || "");
      setPlanTitle(nextTitle);
      setPlanDescription(nextDescription);
      setInitialPlanTitle(nextTitle);
      setInitialPlanDescription(nextDescription);
      setRounds(res.data.rounds || []);
      setTemplates(res.data.scorecardTemplates || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [user, jobId]);

  if (!jobId) return null;
  const hasPlan = rounds.length > 0 || templates.length > 0 || Boolean(planDescription.trim());
  const basicsDirty = planTitle.trim() !== initialPlanTitle.trim() || planDescription.trim() !== initialPlanDescription.trim();

  const createStarterPlan = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const starterRounds = [
      { roundName: "Recruiter Screen", roundType: "PHONE_SCREEN", defaultDurationMinutes: 30, required: true, defaultInterviewerIds: [], active: true, order: 0 },
      { roundName: "Hiring Manager Interview", roundType: "HIRING_MANAGER", defaultDurationMinutes: 45, required: true, defaultInterviewerIds: [], active: true, order: 1 },
      { roundName: "Final Interview", roundType: "FINAL_ROUND", defaultDurationMinutes: 60, required: true, defaultInterviewerIds: [], active: true, order: 2 },
    ];
    const defaultCriteria = [
      { id: "communication", label: "Communication", description: "", ratingScale: "ONE_TO_FIVE", required: true, order: 0 },
      { id: "role_fit", label: "Role fit", description: "", ratingScale: "ONE_TO_FIVE", required: true, order: 1 },
      { id: "experience_relevance", label: "Experience relevance", description: "", ratingScale: "ONE_TO_FIVE", required: true, order: 2 },
      { id: "motivation", label: "Motivation", description: "", ratingScale: "ONE_TO_FIVE", required: true, order: 3 },
      { id: "concerns_risks", label: "Concerns / risks", description: "", ratingScale: "TEXT", required: true, order: 4 },
    ];
    await upsertJobInterviewPlan(jobId, token, {
      title: "Interview plan",
      description: "Repeatable interview process for this role.",
      status: "ACTIVE",
    });
    await upsertInterviewPlanRounds(jobId, token, { rounds: starterRounds });
    const planRes = await fetchJobInterviewPlan(jobId, token);
    const mappedRounds = planRes.ok ? planRes.data.rounds || [] : [];
    for (const round of mappedRounds) {
      await upsertScorecardTemplate(jobId, token, {
        roundId: round.id,
        title: `${round.roundName} scorecard`,
        description: "Use this scorecard to keep interviewer feedback consistent.",
        criteria: defaultCriteria,
      });
    }
    await reload();
    toast.success("Starter interview plan created", "You can now customize rounds and scorecards.");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-lg font-bold text-navy-900">Interview plan</p>
        <p className="mt-1 text-sm text-slate-600">Build a repeatable interview process for this role.</p>
        <p className="mt-1 text-xs text-slate-500">Each round can have default interviewers, duration, and a scorecard. Scheduling uses these defaults automatically.</p>
        <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-slate-700">
          To book time with a candidate, pick them from the job pipeline (or candidate profile) and use{" "}
          <span className="font-semibold">Schedule interview</span>. Rounds here pre-fill the modal when you schedule.
        </p>
        <p className="mt-1 text-xs">
          <Link href={getJobPipelineUrl(jobId)} className="font-semibold text-sky-800 hover:underline">
            Open job pipeline
          </Link>
        </p>
        <div className="mt-3 grid gap-2">
          <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!basicsDirty || savingBasics}
              onClick={async () => {
                if (!user) return;
                setSavingBasics(true);
                try {
                  const token = await user.getIdToken();
                  await upsertJobInterviewPlan(jobId, token, { title: planTitle, description: planDescription, status: "ACTIVE" });
                  await reload();
                  toast.success("Interview plan basics saved");
                } finally {
                  setSavingBasics(false);
                }
              }}
              className={`${recruiterBtnPrimary} w-fit px-3 py-1.5 text-xs disabled:opacity-60`}
            >
              {savingBasics ? "Saving..." : "Save plan basics"}
            </button>
            {basicsDirty ? <span className={recruiterChip.draft}>Draft</span> : <span className={recruiterChip.submitted}>Saved</span>}
          </div>
        </div>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading interview plan...</div>
        ) : !hasPlan ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-base font-semibold text-navy-900">No interview plan yet</p>
            <p className="mt-1 text-sm text-slate-600">Create a starter plan or add rounds manually to define your hiring workflow.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={createStarterPlan} className={`${recruiterBtnPrimary} px-3 py-2 text-xs`}>
                Create starter plan
              </button>
              <button
                type="button"
                onClick={() => setRounds([{ id: `new_${Date.now()}`, planId: "", jobId: "", companyId: "", roundName: "New round", roundType: "CUSTOM", defaultDurationMinutes: 45, order: 0, required: true, defaultInterviewerIds: [], active: true } as InterviewPlanRound])}
                className={`${recruiterBtnSecondary} px-3 py-2 text-xs`}
              >
                Start from scratch
              </button>
            </div>
          </div>
        ) : (
          <InterviewPlanBuilder
            rounds={rounds}
            templates={templates}
            onSaveRounds={async (nextRounds) => {
              if (!user) return;
              const token = await user.getIdToken();
              await upsertInterviewPlanRounds(jobId, token, { rounds: nextRounds });
              await reload();
            }}
            onSaveTemplate={async (roundId, payload) => {
              if (!user) return;
              const token = await user.getIdToken();
              await upsertScorecardTemplate(jobId, token, { roundId, ...payload });
              await reload();
            }}
            onArchiveRound={async (roundId) => {
              if (!user) return;
              const token = await user.getIdToken();
              await deactivateInterviewPlanRound(jobId, roundId, token);
              await reload();
            }}
          />
        )}
      </div>
    </main>
  );
}
