"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import AddToTalentPoolButton from "@/components/employer/AddToTalentPoolButton";
import { pickLatestOfferForCandidate, offerStatusLabel } from "@/lib/offers/client";
import type { CandidateOfferRecord } from "@/lib/offers/types";
import { useToast } from "@/components/NotificationSystem";
import { getCandidateUrl, getCandidatesSearchUrl, getJobCompareUrl, getJobMatchesUrl, getJobOverviewUrl } from "@/lib/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import {
  PIPELINE_STAGES,
  getRecruiterNotes,
  normalizePipelineStage,
  type PipelineStage,
  getOrCreateThread,
  acceptMessageThread,
  type MessageJobDetailsShape,
} from "@/lib/firebase-firestore";
import { formatInterviewWhenLabel } from "@/lib/recruiter-datetime";
import { pipelineStageLabel, recruiterBadge, recruiterChip } from "@/lib/recruiter-ui";
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
} from "@/lib/decision-client";
import {
  fetchJobInterviews,
  fetchJobInterviewPlan,
  fetchInterviewFeedback,
  fetchCandidateDebriefs,
  fetchJobSequences,
} from "@/lib/communication-client";
import { fetchReviewAssignments } from "@/lib/collaboration-client";
import SendCandidateForReviewButton from "@/components/recruiter/SendCandidateForReviewButton";
import InterviewStatusBadge from "@/components/recruiter/InterviewStatusBadge";
import {
  summarizeCandidateEvaluations,
  reviewStatusLabel,
  type CandidateEvaluation,
  type CandidateReviewRequest,
  type JobEvaluationCriterion,
} from "@/lib/hiring-decision";
import { formatRecruiterAttentionLine, getRecruiterNextStep } from "@/lib/communication-status";
import type { RecruiterSummary } from "@/types/matching";

const ScheduleInterviewModal = dynamic(() => import("@/components/recruiter/ScheduleInterviewModal"), { ssr: false });
const OfferModal = dynamic(() => import("@/components/recruiter/OfferModal"), { ssr: false });

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
  nextStep?: string;
  sequenceStatus?: string | null;
  interviewAt?: any;
  interviewStatus?: string | null;
  interviewRoundName?: string | null;
  interviewSyncStatus?: string | null;
  interviewCalendarLink?: string | null;
  interviewCalendarProvider?: string | null;
  reviewPendingCount?: number;
  reviewCompletedCount?: number;
  feedbackSubmittedCount?: number;
  feedbackRequestedCount?: number;
  debriefStatus?: string | null;
  offerId?: string | null;
  offerStatus?: string | null;
  latestOffer?: CandidateOfferRecord | null;
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
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [jobThreadDetails, setJobThreadDetails] = useState<MessageJobDetailsShape | null>(null);
  const [cards, setCards] = useState<PipelineCandidateCard[]>([]);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [scheduleFor, setScheduleFor] = useState<{ candidateId: string; name: string } | null>(null);
  const [messageBusyCandidateId, setMessageBusyCandidateId] = useState<string | null>(null);
  const [offerModal, setOfferModal] = useState<{
    candidateId: string;
    name: string;
    existing: CandidateOfferRecord | null;
  } | null>(null);
  const activeDevTimersRef = useRef<Set<string>>(new Set());

  const offerStageHint = useCallback((stage: PipelineStage) => {
    return ["SHORTLIST", "CONTACTED", "RESPONDED", "INTERVIEW", "FINALIST", "OFFER"].includes(stage);
  }, []);

  useEffect(() => {
    if (!user || !profile || (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER")) {
      router.push("/auth/login");
    }
  }, [user, profile, router]);

  const load = useCallback(async () => {
    const startDevTimer = (label: string) => {
      if (process.env.NODE_ENV !== "development") return;
      const active = activeDevTimersRef.current;
      if (!active.has(label)) {
        console.time(label);
        active.add(label);
      }
    };

    const endDevTimer = (label: string) => {
      if (process.env.NODE_ENV !== "development") return;
      const active = activeDevTimersRef.current;
      if (active.has(label)) {
        console.timeEnd(label);
        active.delete(label);
      }
    };

    if (!jobId || !user) return;
    setLoading(true);
    try {
      startDevTimer("pipeline:load");
      const token = await user.getIdToken();
      const auth = { Authorization: `Bearer ${token}` };

      const [jobRes, pipelineRes, matchesRes, criteriaRes, evaluationsRes, reviewsRes, sequenceRes, interviewsRes, feedbackRes, debriefRes, planRes] = await Promise.all([
        fetch(`/api/job/${jobId}`, { headers: auth }),
        fetch(`/api/job/${jobId}/pipeline`, { headers: auth }),
        fetch(`/api/job/${jobId}/matches`, { headers: auth }),
        fetchJobEvaluationCriteria(jobId, token),
        fetchJobEvaluations(jobId, token),
        fetchJobReviews(jobId, token),
        fetchJobSequences(jobId, token),
        fetchJobInterviews(jobId, token),
        fetchInterviewFeedback(jobId, token),
        fetchCandidateDebriefs(jobId, token),
        fetchJobInterviewPlan(jobId, token),
      ]);

      const jobPayload = await jobRes.json().catch(() => ({}));
      const j = jobPayload?.job as Record<string, unknown> | undefined;
      setJobTitle(String(j?.title || ""));
      if (j) {
        setJobThreadDetails({
          jobId,
          jobTitle: String(j.title || ""),
          employmentType: String(j.employment || ""),
          location: String(
            j.location ||
              [j.locationCity, j.locationState].filter(Boolean).join(", ") ||
              ""
          ),
          jobDescription: String(j.description || ""),
        });
      } else {
        setJobThreadDetails(null);
      }

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
      const feedback = feedbackRes.ok ? (feedbackRes.data.feedback || []) : [];
      const debriefs = debriefRes.ok ? (debriefRes.data.debriefs || []) : [];
      const reviewAssignmentsRes = await fetchReviewAssignments(jobId, token);
      const reviewAssignments = reviewAssignmentsRes.ok ? reviewAssignmentsRes.data.assignments || [] : [];

      const offersRes = await fetch(`/api/job/${jobId}/offers`, { headers: auth });
      const offersPayload = await offersRes.json().catch(() => ({}));
      const offersList =
        offersRes.ok && Array.isArray((offersPayload as { offers?: unknown }).offers)
          ? ((offersPayload as { offers: CandidateOfferRecord[] }).offers || [])
          : [];
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
      const roundNamesById: Record<string, string> = {};
      if (planRes.ok) {
        for (const round of planRes.data.rounds || []) {
          const id = String((round as any)?.id || "").trim();
          const name = String((round as any)?.roundName || "").trim();
          if (id && name) roundNamesById[id] = name;
        }
      }
      const interviewByCandidate = new Map<string, any>();
      for (const interview of interviews as any[]) {
        const cid = String(interview?.candidateId || "");
        if (!cid) continue;
        if (String(interview?.status || "") === "CANCELLED") continue;
        if (!interviewByCandidate.has(cid)) interviewByCandidate.set(cid, interview);
      }
      const feedbackByCandidate = new Map<string, any[]>();
      for (const row of feedback as any[]) {
        const cid = String(row?.candidateId || "");
        if (!cid) continue;
        const list = feedbackByCandidate.get(cid) || [];
        list.push(row);
        feedbackByCandidate.set(cid, list);
      }
      const debriefByCandidate = new Map<string, any>();
      for (const row of debriefs as any[]) {
        const cid = String(row?.candidateId || "");
        if (!cid || debriefByCandidate.has(cid)) continue;
        debriefByCandidate.set(cid, row);
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

      const evalSummaryByCandidate = new Map<string, ReturnType<typeof summarizeCandidateEvaluations>>();
      for (const card of mappedCards) {
        evalSummaryByCandidate.set(
          card.candidateId,
          summarizeCandidateEvaluations(evalsByCandidate.get(card.candidateId) || [], activeCriteria)
        );
      }
      const reviewAssignmentCounts = new Map<string, { pending: number; completed: number }>();
      for (const assignment of reviewAssignments as any[]) {
        const cid = String(assignment?.candidateId || "");
        if (!cid) continue;
        const prev = reviewAssignmentCounts.get(cid) || { pending: 0, completed: 0 };
        const status = String(assignment?.status || "");
        if (status === "REQUESTED") prev.pending += 1;
        if (status === "COMPLETED") prev.completed += 1;
        reviewAssignmentCounts.set(cid, prev);
      }

      setCards(
        mappedCards.map((card) => {
          const latestOffer = pickLatestOfferForCandidate(offersList, card.candidateId);
          const evalSummary = evalSummaryByCandidate.get(card.candidateId);
          const reviewCounts = reviewAssignmentCounts.get(card.candidateId) || { pending: 0, completed: 0 };
          return {
          ...card,
          offerId: latestOffer?.id || null,
          offerStatus: latestOffer ? String(latestOffer.status || "") : null,
          latestOffer: latestOffer || null,
          noteCount: noteMetaByCandidate[card.candidateId]?.count || 0,
          latestNote: noteMetaByCandidate[card.candidateId]?.latest || null,
          evaluationCount: evalSummary?.count || 0,
          evaluationAvgRating: evalSummary?.avgRating ?? null,
          reviewStatus: reviewByCandidate.get(card.candidateId)?.status || null,
          nextStep: getRecruiterNextStep({
            pipelineStage: card.stage,
            hasEvaluation: (evalSummary?.count || 0) > 0,
            isEvaluationComplete: Boolean(evalSummary?.isComplete),
            reviewStatus: reviewByCandidate.get(card.candidateId)?.status,
            nextFollowUpAt: card.nextFollowUpAt,
            interviewAt: interviewByCandidate.get(card.candidateId)?.scheduledAt,
            sequence: sequenceByCandidate.get(card.candidateId) || null,
          }),
          waitingOn: formatRecruiterAttentionLine({
            pipelineStage: card.stage,
            hasEvaluation: (evalSummary?.count || 0) > 0,
            isEvaluationComplete: Boolean(evalSummary?.isComplete),
            reviewStatus: reviewByCandidate.get(card.candidateId)?.status,
            nextFollowUpAt: card.nextFollowUpAt,
            interviewAt: interviewByCandidate.get(card.candidateId)?.scheduledAt,
            sequence: sequenceByCandidate.get(card.candidateId) || null,
          }),
          sequenceStatus: sequenceByCandidate.get(card.candidateId)?.status || null,
          interviewAt: interviewByCandidate.get(card.candidateId)?.scheduledAt || null,
          interviewStatus: interviewByCandidate.get(card.candidateId)?.status || null,
          interviewRoundName: String(
            roundNamesById[String(interviewByCandidate.get(card.candidateId)?.roundId || "")] || ""
          ).trim() || (interviewByCandidate.get(card.candidateId)?.roundId ? "Interview round" : "Manual interview"),
          interviewSyncStatus: interviewByCandidate.get(card.candidateId)?.calendarSyncStatus || null,
          interviewCalendarLink: interviewByCandidate.get(card.candidateId)?.calendarHtmlLink || null,
          interviewCalendarProvider: interviewByCandidate.get(card.candidateId)?.calendarProvider || null,
          reviewPendingCount: reviewCounts.pending,
          reviewCompletedCount: reviewCounts.completed,
          feedbackSubmittedCount: (feedbackByCandidate.get(card.candidateId) || []).filter((f: any) => String(f.status || "") === "SUBMITTED").length,
          feedbackRequestedCount: (feedbackByCandidate.get(card.candidateId) || []).filter((f: any) => String(f.status || "") !== "WAIVED").length,
          debriefStatus: String((debriefByCandidate.get(card.candidateId) || {})?.status || ""),
        };
        })
      );
    } catch (e) {
      console.error("Pipeline page load failed:", e);
      setCards([]);
    } finally {
      endDevTimer("pipeline:load");
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
      OFFER: [],
      HIRED: [],
      REJECTED: [],
    };
    for (const c of cards) {
      out[normalizePipelineStage(c.stage)].push({ ...c, stage: normalizePipelineStage(c.stage) });
    }
    return out;
  }, [cards]);
  const orderedStages: PipelineStage[] = useMemo(
    () => ["SHORTLIST", "NEW", "CONTACTED", "RESPONDED", "INTERVIEW", "FINALIST", "OFFER", "HIRED", "REJECTED"],
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

  const handleOpenMessageThread = async (card: PipelineCandidateCard) => {
    if (!user) return;
    setMessageBusyCandidateId(card.candidateId);
    try {
      const participantIds = [user.uid, card.candidateId].sort();
      const threadOpts = jobThreadDetails ? { jobDetails: jobThreadDetails } : undefined;
      const { id: threadId, error } = await getOrCreateThread(participantIds, threadOpts);
      if (error || !threadId) {
        toast.error("Messages", error || "Could not open message thread.");
        return;
      }
      await acceptMessageThread(threadId, user.uid);
      router.push(`/messages/${threadId}?jobId=${encodeURIComponent(jobId)}`);
    } catch (e: any) {
      toast.error("Messages", e?.message || "Could not open message thread.");
    } finally {
      setMessageBusyCandidateId(null);
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

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* FIX1: non-sticky page header — JobWorkspaceNav is the only sticky bar under SiteHeader */}
      <div className="border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline</p>
            <p className="text-sm font-semibold text-navy-900">{jobTitle || "Job pipeline"}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Everyone you are actively working for this requisition. Shortlist = serious contenders. Talent pools = long-term CRM (see Pools).
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
              Candidates
            </Link>
            <Link
              href={getCandidatesSearchUrl(jobId)}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 font-medium hover:bg-slate-50"
            >
              Find Candidates
            </Link>
            <button
              type="button"
              onClick={launchCompare}
              disabled={selectedCandidateIds.size < 2}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-navy-900 font-medium hover:bg-sky-100 disabled:opacity-50"
            >
              Compare selected {selectedCandidateIds.size > 0 ? `(${selectedCandidateIds.size})` : ""}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <section className={`mb-4 rounded-xl border p-3 text-sm ${
          highlightShortlist ? "border-sky-300 bg-sky-50 text-navy-900" : "border-slate-200 bg-white text-slate-700"
        }`}>
          <span className="font-semibold">Shortlist is your active working set.</span> Keep top contenders in
          <span className="font-semibold"> Shortlisted </span>
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
                  stage === "SHORTLIST" ? "border-sky-200 ring-1 ring-sky-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-navy-900">{pipelineStageLabel(stage)}</h2>
                  <span className="text-xs text-slate-500">{grouped[stage].length}</span>
                </div>
                <div className="space-y-3">
                  {grouped[stage].length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                      No candidates in {pipelineStageLabel(stage).toLowerCase()} yet
                    </div>
                  ) : (
                    grouped[stage].map((card) => (
                      <article key={card.entryId} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                        {/* FIX8: grouped blocks — compare row, identity, signals, meta, stage/tools */}
                        <div className="rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5">
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
                              className="h-3.5 w-3.5 rounded border-slate-300 text-navy-800 focus:ring-sky-400"
                            />
                            Add to compare
                          </label>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <Link href={getCandidateUrl(card.candidateId, jobId)} className="text-base font-medium text-navy-900 hover:underline">
                            {card.name}
                          </Link>
                          <span className="text-xs font-normal text-slate-400">
                            {card.score == null ? "—" : `${Math.round(card.score)}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              card.stage === "SHORTLIST" ? recruiterBadge.positive : recruiterBadge.neutral
                            }`}
                          >
                            {pipelineStageLabel(card.stage)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={getCandidateUrl(card.candidateId, jobId)}
                              className="text-[11px] font-medium text-sky-800 hover:underline"
                            >
                              Profile
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleOpenMessageThread(card)}
                              disabled={messageBusyCandidateId === card.candidateId}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-navy-800 hover:underline disabled:opacity-50"
                            >
                              <MessageSquare className="h-3 w-3" />
                              {messageBusyCandidateId === card.candidateId ? "Opening…" : "Message"}
                            </button>
                            <AddToTalentPoolButton
                              candidateId={card.candidateId}
                              buttonClassName="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-navy-800 hover:bg-slate-100"
                            />
                            <SendCandidateForReviewButton
                              jobId={jobId}
                              candidateId={card.candidateId}
                              candidateName={card.name}
                              buttonClassName="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-navy-800 hover:bg-slate-100"
                            />
                          </div>
                        </div>

                        {(card.positives.length > 0 || card.keyRisk) && (
                          <div className="rounded-md border border-slate-100 bg-slate-50/80 px-2 py-2 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Signals</p>
                            {card.positives.length > 0 && (
                              <p className="text-xs text-slate-800 line-clamp-2">
                                + {card.positives[0]}
                                {card.positives.length > 1 ? ` (+${card.positives.length - 1} on profile)` : ""}
                              </p>
                            )}
                            {card.keyRisk && <p className="text-xs text-amber-900">Risk: {card.keyRisk}</p>}
                          </div>
                        )}

                        <div className="space-y-0.5 text-xs text-slate-400 font-normal">
                          {card.lastContactedAt && <p>Last contacted {formatDate(card.lastContactedAt)}</p>}
                          {card.nextFollowUpAt && <p>Next follow-up {formatDate(card.nextFollowUpAt)}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              (card.noteCount || 0) > 0 ? recruiterBadge.positive : recruiterBadge.inactive
                            }`}
                          >
                            {(card.noteCount || 0) > 0 ? `${card.noteCount} note${card.noteCount === 1 ? "" : "s"}` : "No notes"}
                          </span>
                          {card.latestNote && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={card.latestNote}>
                              {card.latestNote}
                            </span>
                          )}
                          {(card.reviewPendingCount || 0) > 0 && (
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${recruiterBadge.pending}`}>
                              Review pending ({card.reviewPendingCount})
                            </span>
                          )}
                          {(card.reviewCompletedCount || 0) > 0 && (
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${recruiterBadge.positive}`}>
                              Feedback received ({card.reviewCompletedCount})
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug font-normal">
                          <span className="font-medium text-slate-600">{reviewStatusLabel(card.reviewStatus)}</span>
                          {" · "}
                          Waiting on {card.waitingOn || "in progress"}
                          {(card.evaluationCount || 0) > 0
                            ? ` · ${card.evaluationCount} evaluation${(card.evaluationCount || 0) === 1 ? "" : "s"}`
                            : " · No evaluation yet"}
                          {card.interviewAt ? ` · Interview ${formatInterviewWhenLabel(card.interviewAt)}` : ""}
                          {card.sequenceStatus ? ` · Follow-up sequence ${card.sequenceStatus}` : ""}
                        </p>
                        {card.interviewAt && (
                          <div className="pt-1 flex items-center gap-2">
                            <InterviewStatusBadge status={card.interviewStatus || "SCHEDULED"} />
                            <span className="text-[10px] text-slate-500">{card.interviewRoundName || "Interview round"}</span>
                            <span className="text-[10px] text-slate-500">
                              {card.interviewCalendarProvider === "microsoft" ? "Outlook" : "Google"} {card.interviewSyncStatus === "SYNCED" ? "synced" : card.interviewSyncStatus === "FAILED" ? "sync failed" : "not synced"}
                            </span>
                            {card.interviewCalendarLink ? (
                              <a href={card.interviewCalendarLink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-sky-700 underline">
                                Open
                              </a>
                            ) : null}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className={recruiterChip.round}>
                            {card.interviewRoundName || "Interview round"}
                          </span>
                          <span className={recruiterChip.requested}>
                            Feedback requested {card.feedbackRequestedCount || 0}
                          </span>
                          <span className={recruiterChip.submitted}>
                            {card.feedbackSubmittedCount || 0} feedback submitted
                          </span>
                          {card.debriefStatus ? (
                            <span className={String(card.debriefStatus).toUpperCase() === "COMPLETED" ? recruiterChip.submitted : recruiterChip.ready}>
                              {String(card.debriefStatus).toUpperCase() === "COMPLETED" ? "Debrief completed" : "Ready for debrief"}
                            </span>
                          ) : null}
                          {card.offerStatus ? (
                            <span
                              className={
                                String(card.offerStatus).toUpperCase() === "SENT"
                                  ? recruiterChip.requested
                                  : String(card.offerStatus).toUpperCase() === "ACCEPTED"
                                    ? recruiterChip.submitted
                                    : String(card.offerStatus).toUpperCase() === "DECLINED" ||
                                        String(card.offerStatus).toUpperCase() === "WITHDRAWN"
                                      ? recruiterChip.missing
                                      : String(card.offerStatus).toUpperCase() === "PENDING_APPROVAL"
                                        ? recruiterChip.blocked
                                        : String(card.offerStatus).toUpperCase() === "APPROVED"
                                          ? recruiterChip.ready
                                          : recruiterChip.draft
                              }
                            >
                              Offer: {offerStatusLabel(card.offerStatus)}
                            </span>
                          ) : null}
                        </div>
                        {(card.offerStatus || offerStageHint(card.stage)) && (
                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            {card.offerStatus && card.latestOffer ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setOfferModal({
                                    candidateId: card.candidateId,
                                    name: card.name,
                                    existing: card.latestOffer || null,
                                  })
                                }
                                className="font-semibold text-navy-800 underline-offset-2 hover:underline"
                              >
                                View offer
                              </button>
                            ) : offerStageHint(card.stage) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setOfferModal({
                                    candidateId: card.candidateId,
                                    name: card.name,
                                    existing: null,
                                  })
                                }
                                className="font-semibold text-navy-800 underline-offset-2 hover:underline"
                              >
                                Create offer
                              </button>
                            ) : null}
                          </div>
                        )}
                        <p className="text-[11px] text-navy-900 font-medium">{card.nextStep || "Next step: Review candidate"}</p>

                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setScheduleFor({ candidateId: card.candidateId, name: card.name })}
                            className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Schedule interview
                          </button>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Stage</span>
                          <select
                            value={card.stage}
                            onChange={(e) => handleMoveStage(card.entryId, card.candidateId, e.target.value as PipelineStage)}
                            disabled={busyEntryId === card.entryId}
                            className="max-w-[9.5rem] px-2 py-1 rounded-md border border-slate-200 text-xs bg-white"
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {pipelineStageLabel(s)}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Follow-up</span>
                          <input
                            type="date"
                            value={dateInputValue(card.nextFollowUpAt)}
                            onChange={(e) => handleSetFollowUp(card.entryId, card.candidateId, e.target.value)}
                            disabled={busyEntryId === card.entryId}
                            className="max-w-[9.5rem] px-2 py-1 rounded-md border border-slate-200 text-xs bg-white"
                          />
                        </div>

                        {isFollowUpDue(card.nextFollowUpAt) && (
                          <div className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${recruiterBadge.urgent}`}>
                            Follow-up due
                          </div>
                        )}
                        {!isFollowUpDue(card.nextFollowUpAt) && isFollowUpSoon(card.nextFollowUpAt) && (
                          <div className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${recruiterBadge.pending}`}>
                            Follow-up due soon
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <ScheduleInterviewModal
        jobId={jobId}
        candidateId={scheduleFor?.candidateId || ""}
        jobTitle={jobTitle}
        candidateName={scheduleFor?.name}
        isOpen={Boolean(scheduleFor)}
        onClose={() => setScheduleFor(null)}
        onSaved={() => {
          setScheduleFor(null);
          void load();
        }}
      />
      <OfferModal
        jobId={jobId}
        candidateId={offerModal?.candidateId || ""}
        candidateName={offerModal?.name}
        jobTitle={jobTitle}
        isOpen={Boolean(offerModal)}
        onClose={() => setOfferModal(null)}
        existingOffer={offerModal?.existing ?? null}
        onSaved={() => {
          setOfferModal(null);
          void load();
        }}
      />
    </main>
  );
}
