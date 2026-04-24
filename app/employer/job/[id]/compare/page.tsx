"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import {
  PIPELINE_STAGES,
  getRecruiterNotes,
  normalizePipelineStage,
  type CandidatePipelineEntry,
  type PipelineStage,
} from "@/lib/firebase-firestore";
import { postJobPipeline } from "@/lib/pipeline-client";
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
  upsertCandidateReview,
} from "@/lib/decision-client";
import { fetchJobInterviews, fetchJobSequences } from "@/lib/communication-client";
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
import AddToTalentPoolButton from "@/components/employer/AddToTalentPoolButton";

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

  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [rows, setRows] = useState<CompareCandidate[]>([]);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [activeCandidateIds, setActiveCandidateIds] = useState<string[]>([]);
  const [compareSource, setCompareSource] = useState<"manual" | "shortlist" | "pipeline">("manual");
  const [compareError, setCompareError] = useState<string | null>(null);
  const [reviewBusyCandidateId, setReviewBusyCandidateId] = useState<string | null>(null);

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
        const [jobRes, matchesRes, pipelineRes, criteriaRes, evaluationsRes, reviewsRes, sequencesRes, interviewsRes] = await Promise.all([
          fetch(`/api/job/${jobId}`, { headers: auth }),
          fetch(`/api/job/${jobId}/matches`, { headers: auth }),
          fetch(`/api/job/${jobId}/pipeline`, { headers: auth }),
          fetchJobEvaluationCriteria(jobId, token),
          fetchJobEvaluations(jobId, token),
          fetchJobReviews(jobId, token),
          fetchJobSequences(jobId, token),
          fetchJobInterviews(jobId, token),
        ]);

        const jobPayload = await jobRes.json().catch(() => ({}));
        setJobTitle(String(jobPayload?.job?.title || ""));

        const matchesPayload = await matchesRes.json().catch(() => ({}));
        const pipelinePayload = await pipelineRes.json().catch(() => ({}));
        const matches = Array.isArray(matchesPayload.matches) ? matchesPayload.matches : [];
        const pipelineEntries = Array.isArray(pipelinePayload.entries) ? pipelinePayload.entries : [];
        const criteria = criteriaRes.ok ? (criteriaRes.data.criteria || []) : [];
        const evaluations = evaluationsRes.ok ? ((evaluationsRes.data.evaluations || []) as CandidateEvaluation[]) : [];
        const reviews = reviewsRes.ok ? ((reviewsRes.data.reviews || []) as CandidateReviewRequest[]) : [];
        const sequences = sequencesRes.ok ? (sequencesRes.data.sequences || []) : [];
        const interviews = interviewsRes.ok ? (interviewsRes.data.interviews || []) : [];

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
        const interviewByCandidate = new Map<string, any>();
        for (const interview of interviews as any[]) {
          const cid = String(interview?.candidateId || "");
          if (!cid) continue;
          if (String(interview?.status || "") === "CANCELLED") continue;
          if (!interviewByCandidate.has(cid)) interviewByCandidate.set(cid, interview);
        }

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
          });
        }
        setRows(candidates);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, jobId, selectedIds]);

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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Candidate compare</p>
          <h1 className="text-xl font-bold text-navy-900 mt-1">{jobTitle || "Job"} · compare serious contenders</h1>
          <p className="text-sm text-slate-600 mt-1">
            Decide among your strongest fits: stage moves, messages, and notes stay on the same canonical pipeline row per candidate.
          </p>
          {compareError && (
            <p className="mt-2 text-sm text-rose-700 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2" role="alert">
              {compareError}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href={getJobMatchesUrl(jobId)} className="px-3 py-2 rounded-lg border border-slate-200 text-navy-800 hover:bg-slate-50">
              Back to matches
            </Link>
            <Link href={`${getJobPipelineUrl(jobId)}?stage=SHORTLIST`} className="px-3 py-2 rounded-lg border border-violet-200 text-violet-800 hover:bg-violet-50 font-medium">
              Review shortlist
            </Link>
            <Link href={getJobPipelineUrl(jobId)} className="px-3 py-2 rounded-lg border border-slate-200 text-navy-800 hover:bg-slate-50">
              Full pipeline
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
              Shortlist serious candidates from matches or sourcing, then open compare again — or we will auto-fill from shortlist when two or more exist.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={getJobMatchesUrl(jobId)} className="inline-flex px-4 py-2 rounded-lg bg-navy-800 text-white text-sm font-semibold hover:bg-navy-700">
                Build shortlist from matches
              </Link>
              <Link href={`${getJobPipelineUrl(jobId)}?stage=SHORTLIST`} className="inline-flex px-4 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-800 text-sm font-semibold hover:bg-violet-100">
                Open shortlist column
              </Link>
            </div>
          </section>
        ) : (
          <>
            {compareSource !== "manual" && (
              <section className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                {compareSource === "shortlist"
                  ? "Showing your shortlist working set first (serious contenders). Add more from matches or sourcing, then return here."
                  : "Not enough shortlist picks yet — filled from the rest of your active pipeline so you can still compare while you build the shortlist."}
              </section>
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

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className={`rounded-md px-2 py-1 ${row.stage === "SHORTLIST" ? "bg-violet-100 text-violet-800 font-semibold" : "bg-slate-100 text-slate-700"}`}>
                    {row.stage === "SHORTLIST" ? "Shortlist contender" : `Stage: ${row.stage}`}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">Location: {row.location}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{row.hasResume ? "Resume available" : "No resume"}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{row.hasVideo ? "Video available" : "No video"}</span>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">Top strengths</p>
                  <p className="text-sm text-slate-700">{row.strengths.length ? row.strengths.join(" • ") : "No strengths highlighted yet."}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wide text-amber-700 font-semibold mb-1">Key risk / gap</p>
                  <p className="text-sm text-slate-700">{row.risk || "No major risk highlighted."}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Work authorization</p>
                  <p className="text-sm text-slate-700">{row.authorization}</p>
                </div>
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Recruiter note snapshot</p>
                  <p className="text-sm text-slate-700">{row.notesSummary}</p>
                  <p className="text-[11px] mt-1 text-indigo-700 font-medium">
                    {row.noteCount > 0 ? `${row.noteCount} note${row.noteCount === 1 ? "" : "s"} on this candidate` : "No recruiter notes yet"}
                  </p>
                </div>
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Structured evaluation</p>
                  <p className="text-sm text-slate-700">
                    {row.evaluationCount > 0
                      ? `${row.evaluationCount} eval${row.evaluationCount === 1 ? "" : "s"} · ${
                          row.evaluationAvgRating == null ? "no avg rating" : `avg ${row.evaluationAvgRating.toFixed(1)}/5`
                        } · ${recommendationLabel(row.latestRecommendation)}`
                      : "No structured evaluation submitted yet."}
                  </p>
                  <p className="text-[11px] mt-1 text-slate-600">
                    Review: <span className="font-semibold">{reviewStatusLabel(row.reviewStatus)}</span> · Waiting on{" "}
                    <span className="font-semibold">{row.waitingOn}</span>
                  </p>
                  <p className="text-[11px] mt-1 text-slate-600">
                    Sequence: <span className="font-semibold">{row.sequenceStatus || "Not active"}</span>
                    {" · "}
                    Interview:{" "}
                    <span className="font-semibold">
                      {row.interviewAt
                        ? new Date(row.interviewAt?.toDate ? row.interviewAt.toDate() : row.interviewAt).toLocaleString()
                        : "Not scheduled"}
                    </span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={getCandidateUrl(row.candidateId, jobId)}
                    className="px-3 py-2 rounded-lg bg-navy-800 text-white text-xs font-semibold hover:bg-navy-700"
                  >
                    View profile
                  </Link>
                  <Link
                    href={getCandidateUrl(row.candidateId, jobId) + "&action=message"}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message
                  </Link>
                  <AddToTalentPoolButton
                    candidateId={row.candidateId}
                    buttonClassName="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                  />
                  <Link
                    href={`${getCandidateUrl(row.candidateId, jobId)}#recruiter-notes`}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                  >
                    Notes{row.noteCount > 0 ? ` (${row.noteCount})` : ""}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRequestReview(row.candidateId)}
                    disabled={reviewBusyCandidateId === row.candidateId}
                    className="px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-800 text-xs font-semibold hover:bg-violet-100 disabled:opacity-60"
                  >
                    {row.reviewStatus === "REQUESTED" ? "Review requested" : "Request review"}
                  </button>
                  <select
                    value={row.stage}
                    onChange={(e) => handleMoveStage(row.candidateId, e.target.value as PipelineStage)}
                    disabled={busyCandidateId === row.candidateId}
                    className="px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
                  >
                    {PIPELINE_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        Move to {stage}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemove(row.candidateId)}
                    className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
