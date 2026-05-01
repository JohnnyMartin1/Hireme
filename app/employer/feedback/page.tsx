"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { getCompanyJobs, getEmployerJobs } from "@/lib/firebase-firestore";
import { fetchInterviewFeedback, fetchJobInterviewPlan, fetchJobInterviews, patchInterviewFeedback } from "@/lib/communication-client";
import type { InterviewFeedback, ScorecardTemplate } from "@/lib/communication-workflow";
import InterviewFeedbackForm from "@/components/recruiter/InterviewFeedbackForm";
import { useToast } from "@/components/NotificationSystem";
import { recruiterBtnPrimary, recruiterBtnSecondarySm, recruiterChip } from "@/lib/recruiter-ui";

export default function EmployerFeedbackQueuePage() {
  const { user, profile } = useFirebaseAuth();
  const toast = useToast();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DUE" | "DRAFTS" | "SUBMITTED">("ALL");
  const [loading, setLoading] = useState(true);
  const [due, setDue] = useState<Array<InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }>>([]);
  const [drafts, setDrafts] = useState<Array<InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }>>([]);
  const [submitted, setSubmitted] = useState<Array<InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }>>([]);
  const [templatesById, setTemplatesById] = useState<Record<string, ScorecardTemplate>>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [savingFeedbackId, setSavingFeedbackId] = useState<string | null>(null);

  const classify = (rows: Array<InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }>) => {
    setDue(rows.filter((r) => r.status === "REQUESTED"));
    setDrafts(rows.filter((r) => r.status === "IN_PROGRESS"));
    setSubmitted(rows.filter((r) => r.status === "SUBMITTED").slice(0, 12));
  };

  useEffect(() => {
    const load = async () => {
      if (!user || !profile) return;
      setLoading(true);
      const jobsRes = profile.companyId
        ? await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false)
        : await getEmployerJobs(user.uid);
      const jobs = (jobsRes.data || []) as any[];
      const token = await user.getIdToken();
      const templateMap: Record<string, ScorecardTemplate> = {};
      const rows = (
        await Promise.all(
          jobs.map(async (job) => {
            const [res, planRes, interviewsRes] = await Promise.all([
              fetchInterviewFeedback(String(job.id), token, { interviewerUserId: user.uid }),
              fetchJobInterviewPlan(String(job.id), token),
              fetchJobInterviews(String(job.id), token),
            ]);
            if (!res.ok) return [];
            const roundNames: Record<string, string> = {};
            if (planRes.ok) {
              for (const round of planRes.data.rounds || []) {
                const id = String((round as any)?.id || "").trim();
                const name = String((round as any)?.roundName || "").trim();
                if (id && name) roundNames[id] = name;
              }
              for (const template of planRes.data.scorecardTemplates || []) {
                if (template?.id) templateMap[String(template.id)] = template as ScorecardTemplate;
              }
            }
            const interviewById: Record<string, any> = {};
            if (interviewsRes.ok) {
              for (const iv of interviewsRes.data.interviews || []) {
                if (iv?.id) interviewById[String(iv.id)] = iv;
              }
            }
            return (res.data.feedback || []).map((f: any) => ({
              ...f,
              jobTitle: job.title || "Job",
              jobId: String(job.id || ""),
              roundName: String(roundNames[String(f?.roundId || "")] || "").trim() || (f?.roundId ? "Interview round" : "Manual interview"),
              interviewDate: interviewById[String(f?.interviewEventId || "")]?.scheduledAt
                ? new Date(
                    interviewById[String(f?.interviewEventId || "")].scheduledAt?.toDate
                      ? interviewById[String(f?.interviewEventId || "")].scheduledAt.toDate()
                      : interviewById[String(f?.interviewEventId || "")].scheduledAt
                  )
                : null,
              dueLabel: (() => {
                const raw = interviewById[String(f?.interviewEventId || "")]?.scheduledAt;
                if (!raw) return "No interview date";
                const date = new Date(raw?.toDate ? raw.toDate() : raw);
                if (Number.isNaN(date.getTime())) return "No interview date";
                if (date.getTime() < Date.now() && String(f?.status || "") !== "SUBMITTED") return "Overdue";
                return `Due ${date.toLocaleDateString()}`;
              })(),
            }));
          })
        )
      ).flat();
      setTemplatesById(templateMap);
      classify(rows as Array<InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }>);
      setLoading(false);
    };
    load();
  }, [user, profile]);

  const upsertFeedbackInLists = (updated: InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }) => {
    const merged = [...due, ...drafts, ...submitted].filter((row) => row.id !== updated.id);
    classify([updated, ...merged]);
  };

  const handleSave = async (row: InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }, payload: Record<string, unknown>) => {
    if (!user) return;
    setSavingFeedbackId(row.id);
    try {
      const token = await user.getIdToken();
      const res = await patchInterviewFeedback(String(row.jobId || ""), row.id, token, payload);
      if (!res.ok) {
        toast.error("Could not update feedback", res.error || "Please try again.");
        return;
      }
      upsertFeedbackInLists({ ...(res.data.feedback as any), jobId: row.jobId, jobTitle: row.jobTitle, roundName: row.roundName });
      toast.success("Feedback updated");
    } finally {
      setSavingFeedbackId(null);
    }
  };

  const renderRows = (
    rows: Array<InterviewFeedback & { jobTitle: string; jobId: string; roundName: string; interviewDate: Date | null; dueLabel: string }>,
    emptyTitle: string,
    emptyBody: string
  ) =>
    rows.length === 0 ? (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-navy-900">{emptyTitle}</p>
        <p className="mt-1 text-xs text-slate-600">{emptyBody}</p>
      </div>
    ) : (
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-700">{row.jobTitle}</p>
              <span className={row.status === "SUBMITTED" ? recruiterChip.submitted : row.status === "IN_PROGRESS" ? recruiterChip.draft : recruiterChip.requested}>
                {row.status === "SUBMITTED" ? "Feedback submitted" : row.status === "IN_PROGRESS" ? "Draft" : "Feedback due"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Candidate profile</p>
            <p className="text-xs text-slate-500">Interview round: {row.roundName || "Interview round"}</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-slate-500">{row.interviewDate ? row.interviewDate.toLocaleString() : "Interview date not set"}</p>
              <span className={row.dueLabel === "Overdue" ? recruiterChip.missing : recruiterChip.round}>
                {row.dueLabel}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFeedbackId((prev) => (prev === row.id ? null : row.id))}
                className={`${recruiterBtnPrimary} px-2.5 py-1 text-xs`}
              >
                {row.status === "IN_PROGRESS" ? "Continue draft" : row.status === "SUBMITTED" ? "View submitted feedback" : "Complete scorecard"}
              </button>
              <Link href={`/candidate/${row.candidateId}?jobId=${encodeURIComponent(String(row.jobId || ""))}`} className={recruiterBtnSecondarySm}>
                View candidate
              </Link>
            </div>
            {activeFeedbackId === row.id ? (
              <div className="mt-3">
                <InterviewFeedbackForm
                  template={templatesById[String(row.scorecardTemplateId || "")] || null}
                  feedback={row}
                  busy={savingFeedbackId === row.id}
                  onSaveDraft={(payload) => handleSave(row, payload)}
                  onSubmit={(payload) => handleSave(row, payload)}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:pt-16 md:pt-20">
      <h1 className="text-2xl font-bold text-navy-900">My feedback queue</h1>
      <p className="mt-1 text-sm text-slate-600">Track scorecards assigned to you across jobs.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["ALL", "DUE", "DRAFTS", "SUBMITTED"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={activeFilter === filter ? `${recruiterBtnPrimary} rounded-full px-3 py-1 text-xs` : `${recruiterBtnSecondarySm} rounded-full px-3 py-1`}
          >
            {filter === "DUE" ? "Due" : filter === "DRAFTS" ? "Drafts" : filter === "SUBMITTED" ? "Submitted" : "All"}
          </button>
        ))}
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading feedback queue...</p> : null}
      {!loading && due.length === 0 && drafts.length === 0 && activeFilter !== "SUBMITTED" ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Nothing due right now. New scorecards assigned to you will appear here.
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {(activeFilter === "ALL" || activeFilter === "DUE") ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Due from me</p>
          <div className="mt-2">{renderRows(due, "No feedback due", "New interview scorecards assigned to you will appear here.")}</div>
        </section>) : null}
        {(activeFilter === "ALL" || activeFilter === "DRAFTS") ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Drafts</p>
          <div className="mt-2">{renderRows(drafts, "No drafts", "Saved scorecard drafts will appear here until submitted.")}</div>
        </section>) : null}
        {(activeFilter === "ALL" || activeFilter === "SUBMITTED") ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Submitted recently</p>
          <div className="mt-2">{renderRows(submitted, "No submitted feedback", "Completed scorecards show up here for quick reference.")}</div>
        </section>) : null}
      </div>
    </main>
  );
}
