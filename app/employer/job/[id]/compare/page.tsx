"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import ScheduleInterviewModal from "@/components/recruiter/ScheduleInterviewModal";
import OfferModal from "@/components/recruiter/OfferModal";
import {
  getRecruiterNotes,
  normalizePipelineStage,
  type CandidatePipelineEntry,
  type PipelineStage,
  getOrCreateThread,
  acceptMessageThread,
  type MessageJobDetailsShape,
} from "@/lib/firebase-firestore";
import { formatInterviewWhenLabel } from "@/lib/recruiter-datetime";
import { postJobPipeline } from "@/lib/pipeline-client";
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
  upsertCandidateReview,
} from "@/lib/decision-client";
import { fetchCandidateDebriefs, fetchInterviewFeedback, fetchJobInterviewPlan, fetchJobInterviews, fetchJobSequences } from "@/lib/communication-client";
import type { InterviewEvent } from "@/lib/communication-workflow";
import { fetchReviewAssignments } from "@/lib/collaboration-client";
import {
  recommendationLabel,
  reviewStatusLabel,
  summarizeCandidateEvaluations,
  waitingOnLabel,
  type CandidateEvaluation,
  type CandidateReviewRequest,
  type JobEvaluationCriterion,
} from "@/lib/hiring-decision";
import { formatRecruiterAttentionLine } from "@/lib/communication-status";
import {
  getCandidateUrl,
  getJobMatchesUrl,
  getJobPipelineUrl,
  getJobCompareUrl,
} from "@/lib/navigation";
import { pickLatestOfferForCandidate, offerStatusLabel } from "@/lib/offers/client";
import type { CandidateOfferRecord } from "@/lib/offers/types";
import { pipelineStageLabel, recruiterBadge, recruiterChip } from "@/lib/recruiter-ui";
import AddToTalentPoolButton from "@/components/employer/AddToTalentPoolButton";
import SendCandidateForReviewButton from "@/components/recruiter/SendCandidateForReviewButton";
import InterviewStatusBadge from "@/components/recruiter/InterviewStatusBadge";

type CompareCandidate = {
  candidateId: string;
  name: string;
  headline: string;
  score: number | null;
  stage: PipelineStage;
  strengths: string[];
  risk: string | null;
  location: string;
  authorization: string;
  hasResume: boolean;
  hasVideo: boolean;
  noteCount: number;
  notesSummary: string;
  evaluationCount: number;
  evaluationAvgRating: number | null;
  latestRecommendation: string | null;
  reviewStatus: string | null;
  waitingOn: string;
  sequenceStatus: string | null;
  interviewAt: any;
  interviewStatus?: string | null;
  interviewRoundName?: string | null;
  interviewSyncStatus?: string | null;
  interviewCalendarLink?: string | null;
  interviewCalendarProvider?: string | null;
  interviewRecord?: InterviewEvent | null;
  reviewPendingCount?: number;
  reviewCompletedCount?: number;
  feedbackSubmittedCount?: number;
  feedbackRequestedCount?: number;
  recommendationCounts?: Record<string, number>;
  missingFeedbackCount?: number;
  debriefStatus?: string | null;
  offerStatus?: string | null;
  latestOffer?: CandidateOfferRecord | null;
  offerNextAction?: string;
};

function parseCandidateIds(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  ).slice(0, 4);
}

function mapAuthorization(preview: any): string {
  const auth = preview?.workAuthorization;
  if (!auth) return "Not specified";
  if (auth.authorizedToWork === true && auth.requiresVisaSponsorship === false) return "Authorized, no sponsorship";
  if (auth.authorizedToWork === true && auth.requiresVisaSponsorship === true) return "Authorized, sponsorship required";
  if (auth.authorizedToWork === false) return "Not currently authorized";
  return "Not specified";
}

export default function JobComparePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const { user, profile } = useFirebaseAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [jobThreadDetails, setJobThreadDetails] = useState<MessageJobDetailsShape | null>(null);
  const [rows, setRows] = useState<CompareCandidate[]>([]);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [activeCandidateIds, setActiveCandidateIds] = useState<string[]>([]);
  const [compareSource, setCompareSource] = useState<"manual" | "shortlist" | "pipeline">("manual");
  const [compareError, setCompareError] = useState<string | null>(null);
  const [reviewBusyCandidateId, setReviewBusyCandidateId] = useState<string | null>(null);
  const [messageBusyCandidateId, setMessageBusyCandidateId] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<{
    candidateId: string;
    name: string;
    existingInterview: InterviewEvent | null;
  } | null>(null);
  const [compareReloadNonce, setCompareReloadNonce] = useState(0);
  const [offerModal, setOfferModal] = useState<{
    candidateId: string;
    name: string;
    existing: CandidateOfferRecord | null;
  } | null>(null);

  const selectedIds = useMemo(
    () => parseCandidateIds(searchParams.get("candidateIds")),
    [searchParams]
  );

  useEffect(() => {
    if (!user || !profile || (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER")) {
      router.push("/auth/login");
    }
  }, [user, profile, router]);

  useEffect(() => {
    const load = async () => {
      if (!user || !jobId) {
        setRows([]);
        setActiveCandidateIds([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const auth = { Authorization: `Bearer ${token}` };
        const [jobRes, matchesRes, pipelineRes, criteriaRes, evaluationsRes, reviewsRes, sequencesRes, interviewsRes, feedbackRes, debriefRes, planRes] = await Promise.all([
          fetch(`/api/job/${jobId}`, { headers: auth }),
          fetch(`/api/job/${jobId}/matches`, { headers: auth }),
          fetch(`/api/job/${jobId}/pipeline`, { headers: auth }),
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
        const jb = jobPayload?.job as Record<string, unknown> | undefined;
        setJobTitle(String(jb?.title || ""));
        if (jb) {
          setJobThreadDetails({
            jobId,
            jobTitle: String(jb.title || ""),
            employmentType: String(jb.employment || ""),
            location: String(
              jb.location || [jb.locationCity, jb.locationState].filter(Boolean).join(", ") || ""
            ),
            jobDescription: String(jb.description || ""),
          });
        } else {
          setJobThreadDetails(null);
        }

        const matchesPayload = await matchesRes.json().catch(() => ({}));
        const pipelinePayload = await pipelineRes.json().catch(() => ({}));
        const matches = Array.isArray(matchesPayload.matches) ? matchesPayload.matches : [];
        const pipelineEntries = Array.isArray(pipelinePayload.entries) ? pipelinePayload.entries : [];
        const criteria = criteriaRes.ok ? (criteriaRes.data.criteria || []) : [];
        const evaluations = evaluationsRes.ok ? ((evaluationsRes.data.evaluations || []) as CandidateEvaluation[]) : [];
        const reviews = reviewsRes.ok ? ((reviewsRes.data.reviews || []) as CandidateReviewRequest[]) : [];
        const reviewAssignmentsRes = await fetchReviewAssignments(jobId, token);
        const reviewAssignments = reviewAssignmentsRes.ok ? reviewAssignmentsRes.data.assignments || [] : [];
        const offersRes = await fetch(`/api/job/${jobId}/offers`, { headers: auth });
        const offersPayload = await offersRes.json().catch(() => ({}));
        const offersList: CandidateOfferRecord[] =
          offersRes.ok && Array.isArray((offersPayload as { offers?: unknown }).offers)
            ? ((offersPayload as { offers: CandidateOfferRecord[] }).offers || [])
            : [];
        const sequences = sequencesRes.ok ? (sequencesRes.data.sequences || []) : [];
        const interviews = interviewsRes.ok ? (interviewsRes.data.interviews || []) : [];
        const feedback = feedbackRes.ok ? (feedbackRes.data.feedback || []) : [];
        const debriefs = debriefRes.ok ? (debriefRes.data.debriefs || []) : [];

        const pipelineByCandidate = new Map<string, any>();
        for (const entry of pipelineEntries) {
          if (entry?.candidateId) pipelineByCandidate.set(String(entry.candidateId), entry);
        }

        const normalizedPipelineEntries = pipelineEntries.map((entry: CandidatePipelineEntry) => ({
          ...entry,
          stage: normalizePipelineStage(entry.stage),
        }));
        const shortlistIds = normalizedPipelineEntries
          .filter((entry: any) => entry.stage === "SHORTLIST")
          .map((entry: any) => String(entry.candidateId))
          .filter(Boolean);
        const activePipelineIds = normalizedPipelineEntries
          .filter((entry: any) => entry.stage !== "REJECTED")
          .map((entry: any) => String(entry.candidateId))
          .filter(Boolean);

        let resolvedIds = selectedIds.slice(0, 4);
        let source: "manual" | "shortlist" | "pipeline" = "manual";
        if (resolvedIds.length < 2) {
          const mergedShortlist = Array.from(new Set([...resolvedIds, ...shortlistIds])).slice(0, 4);
          if (mergedShortlist.length >= 2) {
            resolvedIds = mergedShortlist;
            source = "shortlist";
          } else {
            const mergedPipeline = Array.from(new Set([...mergedShortlist, ...activePipelineIds])).slice(0, 4);
            resolvedIds = mergedPipeline;
            source = "pipeline";
          }
        }

        setActiveCandidateIds(resolvedIds);
        setCompareSource(source);

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

        const offerNextAction = (off: CandidateOfferRecord | null): string => {
          if (!off) return "Create an offer to move forward.";
          const st = String(off.status || "").toUpperCase();
          if (st === "DRAFT") return "Finish draft and submit or send.";
          if (st === "PENDING_APPROVAL") return "Waiting on approver.";
          if (st === "APPROVED") return "Ready to send to candidate.";
          if (st === "SENT") return "Awaiting candidate response.";
          if (st === "ACCEPTED") return "Accepted — confirm hire / job close on profile.";
          if (st === "DECLINED" || st === "WITHDRAWN") return "Closed — create a revised offer if needed.";
          return offerStatusLabel(st);
        };

        const candidates: CompareCandidate[] = [];
        for (const candidateId of resolvedIds) {
          const row = matches.find((m: any) => m.candidateId === candidateId);
          const preview = row?.candidatePreview || {};
          const pipeline = pipelineByCandidate.get(candidateId);
          const { data: notes } = await getRecruiterNotes(jobId, candidateId);
          const list = notes || [];
          const evaluationSummary = summarizeCandidateEvaluations(
            evalsByCandidate.get(candidateId) || [],
            activeCriteria
          );
          const review = reviewByCandidate.get(candidateId);
          const stage = normalizePipelineStage(pipeline?.stage);
          const latestOffer = pickLatestOfferForCandidate(offersList, candidateId);
          candidates.push({
            candidateId,
            name: `${preview.firstName || ""} ${preview.lastName || ""}`.trim() || "Candidate",
            headline: String(preview.headline || ""),
            score: typeof row?.overallScore === "number" ? row.overallScore : null,
            stage,
            strengths: (row?.recruiterSummary?.strengths || row?.strengths || []).slice(0, 2),
            risk:
              row?.recruiterSummary?.riskNote ||
              row?.recruiterSummary?.gaps?.[0] ||
              row?.gaps?.[0] ||
              null,
            location: String(preview.location || "Not specified"),
            authorization: mapAuthorization(preview),
            hasResume: Boolean(preview.resumeUrl),
            hasVideo: Boolean(preview.videoUrl),
            noteCount: list.length,
            notesSummary: notes?.[0]?.body ? String(notes[0].body).slice(0, 120) : "No recruiter notes yet.",
            evaluationCount: evaluationSummary.count,
            evaluationAvgRating: evaluationSummary.avgRating,
            latestRecommendation: evaluationSummary.latestRecommendation || null,
            reviewStatus: review?.status || null,
            waitingOn: formatRecruiterAttentionLine({
              pipelineStage: stage,
              hasEvaluation: evaluationSummary.count > 0,
              isEvaluationComplete: evaluationSummary.isComplete,
              reviewStatus: review?.status,
              nextFollowUpAt: pipeline?.nextFollowUpAt,
              interviewAt: interviewByCandidate.get(candidateId)?.scheduledAt,
              sequence: sequenceByCandidate.get(candidateId) || null,
            }),
            sequenceStatus: sequenceByCandidate.get(candidateId)?.status || null,
            interviewAt: interviewByCandidate.get(candidateId)?.scheduledAt || null,
            interviewStatus: interviewByCandidate.get(candidateId)?.status || null,
            interviewRoundName: String(
              roundNamesById[String(interviewByCandidate.get(candidateId)?.roundId || "")] || ""
            ).trim() || (interviewByCandidate.get(candidateId)?.roundId ? "Interview round" : "Saved in HireMe only"),
            interviewSyncStatus: interviewByCandidate.get(candidateId)?.calendarSyncStatus || null,
            interviewCalendarLink: interviewByCandidate.get(candidateId)?.calendarHtmlLink || null,
            interviewCalendarProvider: interviewByCandidate.get(candidateId)?.calendarProvider || null,
            interviewRecord: (interviewByCandidate.get(candidateId) as InterviewEvent) || null,
            reviewPendingCount: reviewAssignments.filter((a: any) => String(a.candidateId || "") === candidateId && String(a.status || "") === "REQUESTED").length,
            reviewCompletedCount: reviewAssignments.filter((a: any) => String(a.candidateId || "") === candidateId && String(a.status || "") === "COMPLETED").length,
            feedbackSubmittedCount: (feedbackByCandidate.get(candidateId) || []).filter((f: any) => String(f.status || "") === "SUBMITTED").length,
            feedbackRequestedCount: (feedbackByCandidate.get(candidateId) || []).filter((f: any) => String(f.status || "") !== "WAIVED").length,
            recommendationCounts: (feedbackByCandidate.get(candidateId) || [])
              .filter((f: any) => String(f.status || "") === "SUBMITTED")
              .reduce((acc: Record<string, number>, row: any) => {
                const key = String(row?.overallRecommendation || "").toUpperCase();
                if (!key) return acc;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {}),
            missingFeedbackCount: (feedbackByCandidate.get(candidateId) || []).filter((f: any) => {
              const st = String(f?.status || "");
              return st !== "SUBMITTED" && st !== "WAIVED";
            }).length,
            debriefStatus: String((debriefByCandidate.get(candidateId) || {})?.status || ""),
            offerStatus: latestOffer ? String(latestOffer.status || "") : null,
            latestOffer: latestOffer || null,
            offerNextAction: offerNextAction(latestOffer),
          });
        }
        setRows(candidates);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, jobId, selectedIds, compareReloadNonce]);

  const handleMoveStage = async (candidateId: string, stage: PipelineStage) => {
    if (!user) return;
    setBusyCandidateId(candidateId);
    setCompareError(null);
    try {
      const token = await user.getIdToken();
      const res = await postJobPipeline(jobId, { candidateId, stage }, token);
      if (!res.ok) {
        setCompareError(res.error || "Could not update pipeline stage.");
        return;
      }
      setRows((prev) =>
        prev.map((row) => (row.candidateId === candidateId ? { ...row, stage: normalizePipelineStage(stage) } : row))
      );
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleRemove = (candidateId: string) => {
    const next = activeCandidateIds.filter((id) => id !== candidateId);
    router.push(getJobCompareUrl(jobId, next));
  };

  const handleOpenMessageThread = async (row: CompareCandidate) => {
    if (!user) return;
    setMessageBusyCandidateId(row.candidateId);
    try {
      const participantIds = [user.uid, row.candidateId].sort();
      const opts = jobThreadDetails ? { jobDetails: jobThreadDetails } : undefined;
      const { id: threadId, error } = await getOrCreateThread(participantIds, opts);
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

  const handleRequestReview = async (candidateId: string) => {
    if (!user) return;
    setReviewBusyCandidateId(candidateId);
    try {
      const token = await user.getIdToken();
      const res = await upsertCandidateReview(
        jobId,
        { candidateId, status: "REQUESTED" },
        token
      );
      if (!res.ok) {
        setCompareError(res.error || "Could not request review.");
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.candidateId === candidateId
            ? {
                ...row,
                reviewStatus: "REQUESTED",
                waitingOn: waitingOnLabel({
                  pipelineStage: row.stage,
                  hasEvaluation: row.evaluationCount > 0,
                  isEvaluationComplete: row.evaluationCount > 0,
                  reviewStatus: "REQUESTED",
                }),
              }
            : row
        )
      );
    } finally {
      setReviewBusyCandidateId(null);
    }
  };

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compare</p>
          <h1 className="text-xl font-bold text-navy-900 mt-1">{jobTitle || "Job"}</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Side-by-side view for finalists and serious contenders. Use Pipeline to manage stages day to day.
          </p>
          {compareError && (
            <p className="mt-2 text-sm text-navy-900 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" role="alert">
              {compareError}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link
              href={`${getJobMatchesUrl(jobId)}?filter=SHORTLISTED`}
              className="inline-flex px-3 py-2 rounded-lg bg-navy-800 text-white font-semibold hover:bg-navy-700"
            >
              Back to candidates
            </Link>
            <Link href={getJobPipelineUrl(jobId)} className="px-3 py-2 rounded-lg border border-slate-200 text-navy-800 hover:bg-slate-50">
              Pipeline
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="py-20 text-center text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            Loading compare view...
          </div>
        ) : rows.length < 2 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-navy-900 font-semibold mb-1">You need at least two contenders in view</p>
            <p className="text-sm text-slate-600 mb-4">
              Shortlist serious candidates from candidates or sourcing, then open compare again — or we will auto-fill from shortlist when two or more exist.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={`${getJobMatchesUrl(jobId)}?filter=SHORTLISTED`}
                className="inline-flex px-4 py-2 rounded-lg bg-navy-800 text-white text-sm font-semibold hover:bg-navy-700"
              >
                Open shortlisted candidates
              </Link>
              <Link
                href={getJobPipelineUrl(jobId)}
                className="inline-flex px-4 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 text-sm font-semibold hover:bg-slate-50"
              >
                Pipeline
              </Link>
            </div>
          </section>
        ) : (
          <>
            {compareSource !== "manual" && (
              <p className="mb-4 text-xs text-slate-600 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                {compareSource === "shortlist"
                  ? "Showing shortlisted candidates first. Add or remove people from the Candidates tab, then return here."
                  : "Fewer than two shortlisted candidates — temporarily including other active pipeline stages so you can still compare."}
              </p>
            )}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {rows.map((row) => (
              <article key={row.candidateId} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900">{row.name}</h2>
                    <p className="text-sm text-slate-600">{row.headline || "No headline provided"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-navy-900">{row.score == null ? "—" : `${Math.round(row.score)}%`}</p>
                    <p className="text-xs text-slate-500">match score</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      row.stage === "SHORTLIST" ? recruiterBadge.positive : recruiterBadge.inactive
                    }`}
                  >
                    {pipelineStageLabel(row.stage)}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{row.location}</span>
                  {row.hasResume && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">Resume</span>}
                  {row.hasVideo && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">Video</span>}
                </div>

                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wide text-navy-900 font-semibold mb-0.5">Strongest signal</p>
                  <p className="text-sm text-slate-700">{row.strengths.length ? row.strengths.join(" · ") : "—"}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-0.5">Biggest concern</p>
                  <p className="text-sm text-slate-700">{row.risk || "—"}</p>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Authorization: <span className="text-slate-700">{row.authorization}</span>
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{reviewStatusLabel(row.reviewStatus)}</span>
                  {" · "}Waiting on {row.waitingOn}
                  {row.evaluationCount > 0
                    ? ` · ${row.evaluationCount} evaluation${row.evaluationCount === 1 ? "" : "s"} (${recommendationLabel(row.latestRecommendation)})`
                    : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(row.reviewPendingCount || 0) > 0 && (
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${recruiterBadge.pending}`}>
                      Pending reviews {row.reviewPendingCount}
                    </span>
                  )}
                  {(row.reviewCompletedCount || 0) > 0 && (
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${recruiterBadge.positive}`}>
                      Feedback received {row.reviewCompletedCount}
                    </span>
                  )}
                  <span className={recruiterChip.requested}>
                    Feedback requested {row.feedbackRequestedCount || 0}
                  </span>
                  <span className={recruiterChip.submitted}>
                    {row.feedbackSubmittedCount || 0} feedback submitted
                  </span>
                  {row.debriefStatus ? (
                    <span className={String(row.debriefStatus).toUpperCase() === "COMPLETED" ? recruiterChip.submitted : recruiterChip.ready}>
                      {String(row.debriefStatus).toUpperCase() === "COMPLETED" ? "Debrief completed" : "Ready for debrief"}
                    </span>
                  ) : null}
                  {row.offerStatus ? (
                    <span className={recruiterChip.draft}>Offer: {offerStatusLabel(row.offerStatus)}</span>
                  ) : null}
                </div>
                {["FINALIST", "OFFER", "HIRED", "SHORTLIST", "INTERVIEW"].includes(row.stage) && (
                  <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs text-indigo-950">
                    <p className="font-semibold text-indigo-900">Offer readiness</p>
                    <p className="mt-0.5 text-indigo-900/90">{row.offerNextAction}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.latestOffer ? (
                        <button
                          type="button"
                          onClick={() =>
                            setOfferModal({
                              candidateId: row.candidateId,
                              name: row.name,
                              existing: row.latestOffer || null,
                            })
                          }
                          className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-50"
                        >
                          View offer
                        </button>
                      ) : row.stage === "FINALIST" || row.stage === "INTERVIEW" || row.stage === "SHORTLIST" ? (
                        <button
                          type="button"
                          onClick={() =>
                            setOfferModal({
                              candidateId: row.candidateId,
                              name: row.name,
                              existing: null,
                            })
                          }
                          className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700"
                        >
                          Create offer
                        </button>
                      ) : null}
                      <Link
                        href={getCandidateUrl(row.candidateId, jobId)}
                        className="inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-white"
                      >
                        Profile (offer section)
                      </Link>
                    </div>
                  </div>
                )}
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Recommendation distribution</p>
                  {Object.keys(row.recommendationCounts || {}).length > 0 ? (
                    <p className="mt-1 text-xs text-slate-700">
                      {Object.entries(row.recommendationCounts || {})
                        .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
                        .join(" • ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">No submitted recommendations yet.</p>
                  )}
                  {(row.missingFeedbackCount || 0) > 0 ? (
                    <div className="mt-1">
                      <span className={recruiterChip.missing}>Missing feedback {row.missingFeedbackCount}</span>
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                  <span className="font-semibold text-slate-700">Notes:</span> {row.notesSummary}
                </p>

                <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <summary className="cursor-pointer font-semibold text-slate-600 select-none">Interview & follow-up sequence</summary>
                  <p className="mt-2 text-slate-600">
                    Sequence: <span className="font-medium text-slate-800">{row.sequenceStatus || "Not active"}</span>
                  </p>
                  <p className="mt-1 text-slate-600">
                    Interview:{" "}
                    <span className="font-medium text-slate-800">
                      {row.interviewAt ? formatInterviewWhenLabel(row.interviewAt) : "Not scheduled"}
                    </span>
                  </p>
                  <p className="mt-1 text-slate-600">
                    Round: <span className="font-medium text-slate-800">{row.interviewRoundName || "Interview round"}</span>
                  </p>
                  {row.interviewAt && (
                    <div className="mt-1 flex items-center gap-2">
                      <InterviewStatusBadge status={row.interviewStatus || "SCHEDULED"} />
                      <span className="text-xs text-slate-500">
                        {row.interviewCalendarProvider === "microsoft" ? "Outlook" : "Google"} {row.interviewSyncStatus === "SYNCED" ? "synced" : row.interviewSyncStatus === "FAILED" ? "sync failed" : "not synced"}
                      </span>
                      {row.interviewCalendarLink ? (
                        <a href={row.interviewCalendarLink} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sky-700 underline">
                          Open
                        </a>
                      ) : null}
                    </div>
                  )}
                  {row.evaluationCount > 0 && (
                    <p className="mt-1 text-slate-600">
                      Avg rating:{" "}
                      {row.evaluationAvgRating == null ? "—" : `${row.evaluationAvgRating.toFixed(1)}/5`}
                    </p>
                  )}
                </details>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={getCandidateUrl(row.candidateId, jobId)}
                    className="px-3 py-2 rounded-lg bg-navy-800 text-white text-xs font-semibold hover:bg-navy-700"
                  >
                    View profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleOpenMessageThread(row)}
                    disabled={messageBusyCandidateId === row.candidateId}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {messageBusyCandidateId === row.candidateId ? "Opening…" : "Message"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleFor({
                        candidateId: row.candidateId,
                        name: row.name,
                        existingInterview:
                          ["SHORTLIST", "INTERVIEW", "FINALIST"].includes(row.stage) && row.interviewRecord
                            ? row.interviewRecord
                            : null,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                  >
                    {row.interviewRecord && ["SHORTLIST", "INTERVIEW", "FINALIST"].includes(row.stage)
                      ? "Schedule follow-up interview"
                      : "Schedule interview"}
                  </button>
                  {row.stage !== "FINALIST" && (
                    <button
                      type="button"
                      onClick={() => handleMoveStage(row.candidateId, "FINALIST")}
                      disabled={busyCandidateId === row.candidateId}
                      className="px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-navy-900 text-xs font-semibold hover:bg-sky-100 disabled:opacity-60"
                    >
                      Move to finalist
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRequestReview(row.candidateId)}
                    disabled={reviewBusyCandidateId === row.candidateId}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-navy-800 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {row.reviewStatus === "REQUESTED" ? "Waiting on manager review" : "Request review"}
                  </button>
                  <SendCandidateForReviewButton
                    jobId={jobId}
                    candidateId={row.candidateId}
                    candidateName={row.name}
                    buttonClassName="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                  />
                </div>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-500 select-none">More actions</summary>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AddToTalentPoolButton
                      candidateId={row.candidateId}
                      buttonClassName="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    />
                    <Link
                      href={`${getCandidateUrl(row.candidateId, jobId)}#recruiter-notes`}
                      className="text-xs font-semibold text-sky-800 hover:underline"
                    >
                      Notes{row.noteCount > 0 ? ` (${row.noteCount})` : ""}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(row.candidateId)}
                      className="text-xs font-semibold text-slate-700 hover:underline"
                    >
                      Remove from compare
                    </button>
                  </div>
                </details>
              </article>
            ))}
            </section>
          </>
        )}
      </div>

      <ScheduleInterviewModal
        jobId={jobId}
        candidateId={scheduleFor?.candidateId || ""}
        jobTitle={jobTitle}
        candidateName={scheduleFor?.name}
        isOpen={Boolean(scheduleFor)}
        existingInterview={scheduleFor?.existingInterview || undefined}
        onClose={() => setScheduleFor(null)}
        onSaved={() => {
          setScheduleFor(null);
          setCompareReloadNonce((n) => n + 1);
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
          setCompareReloadNonce((n) => n + 1);
        }}
      />
    </main>
  );
}
