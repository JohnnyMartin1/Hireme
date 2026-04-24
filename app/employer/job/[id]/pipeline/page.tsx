"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import AddToTalentPoolButton from "@/components/employer/AddToTalentPoolButton";
import { getCandidateUrl, getCandidatesSearchUrl, getDashboardUrl, getJobCompareUrl, getJobMatchesUrl, getJobOverviewUrl, getMessagesUrl } from "@/lib/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { PIPELINE_STAGES, getRecruiterNotes, normalizePipelineStage, type PipelineStage } from "@/lib/firebase-firestore";
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
  upsertCandidateReview,
} from "@/lib/decision-client";
import {
  fetchJobInterviews,
  fetchJobSequences,
  patchJobSequence,
  upsertJobSequence,
} from "@/lib/communication-client";
import {
  summarizeCandidateEvaluations,
  reviewStatusLabel,
  type CandidateEvaluation,
  type CandidateReviewRequest,
  type JobEvaluationCriterion,
} from "@/lib/hiring-decision";
import { formatRecruiterAttentionLine } from "@/lib/communication-status";
import type { RecruiterSummary } from "@/types/matching";

type MatchScoreRow = {
  candidateId: string;
  overallScore?: number;
  strengths?: string[];
  gaps?: string[];
  candidatePreview?: { firstName?: string | null; lastName?: string | null };
  recruiterSummary?: Pick<RecruiterSummary, "strengths" | "gaps" | "riskNote">;
};

type PipelineCandidateCard = {
  entryId: string;
  candidateId: string;
  name: string;
  score: number | null;
  stage: PipelineStage;
  positives: string[];
  keyRisk: string | null;
  lastContactedAt?: any;
  nextFollowUpAt?: any;
  noteCount?: number;
  latestNote?: string | null;
  evaluationCount?: number;
  evaluationAvgRating?: number | null;
  reviewStatus?: string | null;
  waitingOn?: string;
  sequenceStatus?: string | null;
  interviewAt?: any;
  interviewStatus?: string | null;
};

function dateInputValue(v: any): string {
  if (!v) return "";
  const asDate = v?.toDate
    ? v.toDate()
    : typeof v?._seconds === "number"
      ? new Date(v._seconds * 1000)
      : new Date(v);
  if (Number.isNaN(asDate.getTime())) return "";
  return asDate.toISOString().slice(0, 10);
}

function isFollowUpDue(v: any): boolean {
  if (!v) return false;
  const asDate = v?.toDate
    ? v.toDate()
    : typeof v?._seconds === "number"
      ? new Date(v._seconds * 1000)
      : new Date(v);
  return asDate.getTime() < Date.now();
}

function isFollowUpSoon(v: any): boolean {
  if (!v) return false;
  const asDate = v?.toDate
    ? v.toDate()
    : typeof v?._seconds === "number"
      ? new Date(v._seconds * 1000)
      : new Date(v);
  const diff = asDate.getTime() - Date.now();
  return diff >= 0 && diff <= 2 * 24 * 60 * 60 * 1000;
}

function formatDate(v: any): string {
  if (!v) return "";
  const asDate = v?.toDate
    ? v.toDate()
    : typeof v?._seconds === "number"
      ? new Date(v._seconds * 1000)
      : new Date(v);
  if (Number.isNaN(asDate.getTime())) return "";
  return asDate.toLocaleDateString();
}

export default function JobPipelinePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const { user, profile } = useFirebaseAuth();

  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [cards, setCards] = useState<PipelineCandidateCard[]>([]);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [reviewBusyCandidateId, setReviewBusyCandidateId] = useState<string | null>(null);
  const [sequenceBusyCandidateId, setSequenceBusyCandidateId] = useState<string | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !profile || (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER")) {
      router.push("/auth/login");
    }
  }, [user, profile, router]);

  const load = useCallback(async () => {
    if (!jobId || !user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const auth = { Authorization: `Bearer ${token}` };

      const [jobRes, pipelineRes, matchesRes, criteriaRes, evaluationsRes, reviewsRes, sequenceRes, interviewsRes] = await Promise.all([
        fetch(`/api/job/${jobId}`, { headers: auth }),
        fetch(`/api/job/${jobId}/pipeline`, { headers: auth }),
        fetch(`/api/job/${jobId}/matches`, { headers: auth }),
        fetchJobEvaluationCriteria(jobId, token),
        fetchJobEvaluations(jobId, token),
        fetchJobReviews(jobId, token),
        fetchJobSequences(jobId, token),
        fetchJobInterviews(jobId, token),
      ]);

      const jobPayload = await jobRes.json().catch(() => ({}));
      setJobTitle(String(jobPayload?.job?.title || ""));

      const pipelinePayload = await pipelineRes.json().catch(() => ({}));
      const pipelineEntries = Array.isArray(pipelinePayload.entries) ? pipelinePayload.entries : [];
      if (!pipelineRes.ok) {
        setCards([]);
        return;
      }

      const matchesJson = await matchesRes.json().catch(() => ({}));
      const matchesList: MatchScoreRow[] = matchesRes.ok && Array.isArray(matchesJson.matches) ? matchesJson.matches : [];
      const criteria = criteriaRes.ok ? (criteriaRes.data.criteria || []) : [];
      const evaluations = evaluationsRes.ok ? ((evaluationsRes.data.evaluations || []) as CandidateEvaluation[]) : [];
      const reviews = reviewsRes.ok ? ((reviewsRes.data.reviews || []) as CandidateReviewRequest[]) : [];
      const sequences = sequenceRes.ok ? (sequenceRes.data.sequences || []) : [];
      const interviews = interviewsRes.ok ? (interviewsRes.data.interviews || []) : [];
      const activeCriteria = [...criteria]
        .filter((c: JobEvaluationCriterion) => c.active !== false)
        .sort((a: JobEvaluationCriterion, b: JobEvaluationCriterion) => Number(a.order || 0) - Number(b.order || 0));

      const evalsByCandidate = new Map<string, CandidateEvaluation[]>();
      for (const ev of evaluations) {
        const cid = String(ev.candidateId || "");
        if (!cid) continue;
        const list = evalsByCandidate.get(cid) || [];
        list.push(ev);
        evalsByCandidate.set(cid, list);
      }
      const reviewByCandidate = new Map<string, CandidateReviewRequest>();
      for (const rv of reviews) {
        const cid = String(rv.candidateId || "");
        if (!cid) continue;
        if (!reviewByCandidate.has(cid)) reviewByCandidate.set(cid, rv);
      }
      const sequenceByCandidate = new Map<string, any>();
      for (const seq of sequences as any[]) {
        const cid = String(seq?.candidateId || "");
        if (!cid) continue;
        if (!sequenceByCandidate.has(cid)) sequenceByCandidate.set(cid, seq);
      }
      const interviewByCandidate = new Map<string, any>();
      for (const interview of interviews as any[]) {
        const cid = String(interview?.candidateId || "");
        if (!cid) continue;
        if (String(interview?.status || "") === "CANCELLED") continue;
        if (!interviewByCandidate.has(cid)) interviewByCandidate.set(cid, interview);
      }

      const matchDetailsByCandidate = new Map<string, {
        score: number | null;
        positives: string[];
        keyRisk: string | null;
      }>();
      const nameByCandidate = new Map<string, string>();

      for (const row of matchesList) {
        if (!row.candidateId) continue;
        const positives = (row.recruiterSummary?.strengths || row.strengths || [])
          .map((item: string) => String(item || "").trim())
          .filter(Boolean)
          .slice(0, 2);
        const riskSource = row.recruiterSummary?.riskNote || row.recruiterSummary?.gaps?.[0] || row.gaps?.[0] || null;
        matchDetailsByCandidate.set(row.candidateId, {
          score: typeof row.overallScore === "number" ? row.overallScore : null,
          positives,
          keyRisk: riskSource ? String(riskSource).trim() : null,
        });
        const prev = row.candidatePreview;
        if (prev) {
          const name = `${prev.firstName || ""} ${prev.lastName || ""}`.trim();
          if (name) nameByCandidate.set(row.candidateId, name);
        }
      }

      const mappedCards: PipelineCandidateCard[] = pipelineEntries.map((entry: any) => ({
        entryId: entry.id,
        candidateId: entry.candidateId,
        name: nameByCandidate.get(entry.candidateId) || `Candidate ${String(entry.candidateId || "").slice(0, 6)}`,
        score: matchDetailsByCandidate.get(entry.candidateId)?.score ?? null,
        stage: normalizePipelineStage(entry.stage),
        positives: matchDetailsByCandidate.get(entry.candidateId)?.positives || [],
        keyRisk: matchDetailsByCandidate.get(entry.candidateId)?.keyRisk || null,
        lastContactedAt: entry.lastContactedAt,
        nextFollowUpAt: entry.nextFollowUpAt,
      }));

      const notePairs = await Promise.all(
        mappedCards.map(async (card) => {
          const { data: notes } = await getRecruiterNotes(jobId, card.candidateId);
          const list = notes || [];
          return [
            card.candidateId,
            {
              count: list.length,
              latest: list[0]?.body ? String(list[0].body).slice(0, 100) : null,
            },
          ] as const;
        })
      );
      const noteMetaByCandidate = Object.fromEntries(notePairs) as Record<string, { count: number; latest: string | null }>;

      setCards(
        mappedCards.map((card) => ({
          ...card,
          noteCount: noteMetaByCandidate[card.candidateId]?.count || 0,
          latestNote: noteMetaByCandidate[card.candidateId]?.latest || null,
          evaluationCount: summarizeCandidateEvaluations(
            evalsByCandidate.get(card.candidateId) || [],
            activeCriteria
          ).count,
          evaluationAvgRating: summarizeCandidateEvaluations(
            evalsByCandidate.get(card.candidateId) || [],
            activeCriteria
          ).avgRating,
          reviewStatus: reviewByCandidate.get(card.candidateId)?.status || null,
          waitingOn: formatRecruiterAttentionLine({
            pipelineStage: card.stage,
            hasEvaluation:
              summarizeCandidateEvaluations(evalsByCandidate.get(card.candidateId) || [], activeCriteria).count > 0,
            isEvaluationComplete:
              summarizeCandidateEvaluations(evalsByCandidate.get(card.candidateId) || [], activeCriteria).isComplete,
            reviewStatus: reviewByCandidate.get(card.candidateId)?.status,
            nextFollowUpAt: card.nextFollowUpAt,
            interviewAt: interviewByCandidate.get(card.candidateId)?.scheduledAt,
            sequence: sequenceByCandidate.get(card.candidateId) || null,
          }),
          sequenceStatus: sequenceByCandidate.get(card.candidateId)?.status || null,
          interviewAt: interviewByCandidate.get(card.candidateId)?.scheduledAt || null,
          interviewStatus: interviewByCandidate.get(card.candidateId)?.status || null,
        }))
      );
    } catch (e) {
      console.error("Pipeline page load failed:", e);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const out: Record<PipelineStage, PipelineCandidateCard[]> = {
      NEW: [],
      SHORTLIST: [],
      CONTACTED: [],
      RESPONDED: [],
      INTERVIEW: [],
      FINALIST: [],
      REJECTED: [],
    };
    for (const c of cards) {
      out[normalizePipelineStage(c.stage)].push({ ...c, stage: normalizePipelineStage(c.stage) });
    }
    return out;
  }, [cards]);
  const orderedStages: PipelineStage[] = useMemo(
    () => ["SHORTLIST", "NEW", "CONTACTED", "RESPONDED", "INTERVIEW", "FINALIST", "REJECTED"],
    []
  );
  const highlightShortlist = (searchParams.get("stage") || "").toUpperCase() === "SHORTLIST";

  const launchCompare = () => {
    const ids = Array.from(selectedCandidateIds).slice(0, 4);
    if (ids.length < 2) return;
    router.push(getJobCompareUrl(jobId, ids));
  };

  const handleMoveStage = async (entryId: string, candidateId: string, stage: PipelineStage) => {
    if (!user) return;
    setBusyEntryId(entryId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/job/${jobId}/pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidateId, stage }),
      });
      if (!res.ok) return;
      await load();
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleSetFollowUp = async (entryId: string, candidateId: string, rawDate: string) => {
    if (!user) return;
    setBusyEntryId(entryId);
    try {
      const date = rawDate ? new Date(`${rawDate}T12:00:00`) : null;
      const token = await user.getIdToken();
      const res = await fetch(`/api/job/${jobId}/pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidateId,
          stage: cards.find((c) => c.entryId === entryId)?.stage || "NEW",
          nextFollowUpAt: date ? date.toISOString() : null,
        }),
      });
      if (!res.ok) return;
      await load();
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleRequestReview = async (candidateId: string) => {
    if (!user) return;
    setReviewBusyCandidateId(candidateId);
    try {
      const token = await user.getIdToken();
      const res = await upsertCandidateReview(
        jobId,
        {
          candidateId,
          status: "REQUESTED",
        },
        token
      );
      if (!res.ok) return;
      await load();
    } finally {
      setReviewBusyCandidateId(null);
    }
  };

  const handleStartSequence = async (candidateId: string) => {
    if (!user) return;
    setSequenceBusyCandidateId(candidateId);
    try {
      const token = await user.getIdToken();
      await upsertJobSequence(jobId, token, {
        candidateId,
        steps: [
          { delayDays: 0, body: "Hi! Reaching out with next steps for this role." },
          { delayDays: 3, body: "Friendly follow-up in case this got buried." },
        ],
      });
      await load();
    } finally {
      setSequenceBusyCandidateId(null);
    }
  };

  const handleStopSequence = async (candidateId: string) => {
    if (!user) return;
    setSequenceBusyCandidateId(candidateId);
    try {
      const token = await user.getIdToken();
      await patchJobSequence(jobId, token, {
        candidateId,
        status: "STOPPED",
        stoppedReason: "MANUAL_STOP",
      });
      await load();
    } finally {
      setSequenceBusyCandidateId(null);
    }
  };

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</p>
            <p className="text-sm font-semibold text-navy-900">{jobTitle || "Job pipeline"}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Active candidates for this job (all stages you are still working). Shortlist marks serious contenders; talent pools live under Pools in the main nav.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={getJobOverviewUrl(jobId)}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50"
            >
              Job overview
            </Link>
            <Link
              href={getJobMatchesUrl(jobId)}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50"
            >
              Matches
            </Link>
            <Link
              href={getDashboardUrl()}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <Link
              href={getCandidatesSearchUrl(jobId)}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50"
            >
              Find more candidates
            </Link>
            <button
              type="button"
              onClick={launchCompare}
              disabled={selectedCandidateIds.size < 2}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-800 font-medium hover:bg-violet-100 disabled:opacity-50"
            >
              Compare selected {selectedCandidateIds.size > 0 ? `(${selectedCandidateIds.size})` : ""}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <section className={`mb-4 rounded-xl border p-3 text-sm ${
          highlightShortlist ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-200 bg-white text-slate-700"
        }`}>
          <span className="font-semibold">Shortlist is your active working set.</span> Keep top contenders in
          <span className="font-semibold"> SHORTLIST </span>
          and launch compare when you have 2+ ready to decide.
        </section>
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Loading pipeline...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orderedStages.map((stage) => (
              <section
                key={stage}
                className={`bg-white rounded-xl border p-4 min-h-[280px] ${
                  stage === "SHORTLIST" ? "border-violet-200 ring-1 ring-violet-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`font-semibold ${stage === "SHORTLIST" ? "text-violet-800" : "text-navy-900"}`}>{stage}</h2>
                  <span className="text-xs text-slate-500">{grouped[stage].length}</span>
                </div>
                <div className="space-y-3">
                  {grouped[stage].length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                      No candidates in {stage.toLowerCase()} yet
                    </div>
                  ) : (
                    grouped[stage].map((card) => (
                      <article key={card.entryId} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                        <div className="mb-1">
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.has(card.candidateId)}
                              onChange={() =>
                                setSelectedCandidateIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(card.candidateId)) next.delete(card.candidateId);
                                  else next.add(card.candidateId);
                                  return next;
                                })
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                            />
                            Add to compare
                          </label>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <Link href={getCandidateUrl(card.candidateId, jobId)} className="font-medium text-navy-900 hover:underline">
                            {card.name}
                          </Link>
                          <span className="text-xs font-semibold text-slate-700">
                            {card.score == null ? "—" : `${Math.round(card.score)}%`}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            card.stage === "SHORTLIST"
                              ? "border-violet-200 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}>
                            {card.stage}
                          </span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={getCandidateUrl(card.candidateId, jobId)}
                              className="text-[11px] font-medium text-sky-700 hover:text-sky-800"
                            >
                              Profile
                            </Link>
                            <Link
                              href={getMessagesUrl(jobId)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-navy-700 hover:text-navy-900"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Inbox
                            </Link>
                            <AddToTalentPoolButton
                              candidateId={card.candidateId}
                              buttonClassName="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-navy-700 hover:bg-slate-50"
                            />
                          </div>
                        </div>

                        {card.positives.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {card.positives.map((signal, index) => (
                              <p key={`${card.entryId}-signal-${index}`} className="text-[11px] text-emerald-800">
                                + {signal}
                              </p>
                            ))}
                          </div>
                        )}
                        {card.keyRisk && (
                          <p className="mt-1 text-[11px] text-amber-800">Risk: {card.keyRisk}</p>
                        )}

                        <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                          {card.lastContactedAt && (
                            <p>
                              Last contacted: {formatDate(card.lastContactedAt)}
                            </p>
                          )}
                          {card.nextFollowUpAt && (
                            <p>
                              Next follow-up: {formatDate(card.nextFollowUpAt)}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            (card.noteCount || 0) > 0
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}>
                            {(card.noteCount || 0) > 0 ? `${card.noteCount} note${card.noteCount === 1 ? "" : "s"}` : "No notes"}
                          </span>
                          {card.latestNote && (
                            <span className="text-[10px] text-slate-500 truncate" title={card.latestNote}>
                              {card.latestNote}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            (card.evaluationCount || 0) > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}>
                            {(card.evaluationCount || 0) > 0
                              ? `Eval ${card.evaluationCount}${card.evaluationAvgRating == null ? "" : ` · ${card.evaluationAvgRating.toFixed(1)}/5`}`
                              : "No evaluation"}
                          </span>
                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                            {reviewStatusLabel(card.reviewStatus)}
                          </span>
                          <span className="text-[10px] text-slate-500">Waiting on {card.waitingOn || "in progress"}</span>
                          {card.sequenceStatus && (
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              card.sequenceStatus === "ACTIVE"
                                ? "border-violet-200 bg-violet-50 text-violet-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}>
                              Sequence: {card.sequenceStatus}
                            </span>
                          )}
                          {card.interviewAt && (
                            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Interview ({String(card.interviewStatus || "SCHEDULED").toLowerCase()}):{" "}
                              {formatDate(card.interviewAt)}
                            </span>
                          )}
                        </div>

                        <div className="mt-2">
                          <select
                            value={card.stage}
                            onChange={(e) => handleMoveStage(card.entryId, card.candidateId, e.target.value as PipelineStage)}
                            disabled={busyEntryId === card.entryId}
                            className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-2">
                          <input
                            type="date"
                            value={dateInputValue(card.nextFollowUpAt)}
                            onChange={(e) => handleSetFollowUp(card.entryId, card.candidateId, e.target.value)}
                            disabled={busyEntryId === card.entryId}
                            className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
                          />
                        </div>

                        {isFollowUpDue(card.nextFollowUpAt) && (
                          <div className="mt-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-700 font-medium">
                            Follow-up due
                          </div>
                        )}
                        {!isFollowUpDue(card.nextFollowUpAt) && isFollowUpSoon(card.nextFollowUpAt) && (
                          <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 font-medium">
                            Follow-up due soon
                          </div>
                        )}
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => handleRequestReview(card.candidateId)}
                            disabled={reviewBusyCandidateId === card.candidateId}
                            className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60"
                          >
                            {card.reviewStatus === "REQUESTED" ? "Review requested" : "Request review"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              card.sequenceStatus === "ACTIVE"
                                ? handleStopSequence(card.candidateId)
                                : handleStartSequence(card.candidateId)
                            }
                            disabled={sequenceBusyCandidateId === card.candidateId}
                            className="ml-2 inline-flex rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60"
                          >
                            {card.sequenceStatus === "ACTIVE" ? "Stop sequence" : "Start sequence"}
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
