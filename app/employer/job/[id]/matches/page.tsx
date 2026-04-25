"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MapPin, RefreshCw, FileText, Video, MessageSquare, User } from "lucide-react";
import { getCandidateUrl, getCandidatesSearchUrl, getJobCompareUrl } from "@/lib/navigation";
import AddToTalentPoolButton from "@/components/employer/AddToTalentPoolButton";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import type { RecruiterSummary } from "@/types/matching";
import {
  PIPELINE_STAGES,
  getRecruiterNotes,
  normalizePipelineStage,
  type PipelineStage,
} from "@/lib/firebase-firestore";
import {
  pipelineStageLabel,
  recruiterBadge,
  recruiterBtnGhost,
  recruiterBtnPrimary,
  recruiterBtnPrimaryLg,
  recruiterBtnSecondarySm,
} from "@/lib/recruiter-ui";
import { getRecruiterNextStep } from "@/lib/communication-status";
import { fetchReviewAssignments } from "@/lib/collaboration-client";
import SendCandidateForReviewButton from "@/components/recruiter/SendCandidateForReviewButton";

type CandidatePreview = {
  firstName?: string | null;
  lastName?: string | null;
  headline?: string | null;
  school?: string | null;
  major?: string | null;
  location?: string | null;
  resumeUrl?: string | null;
  videoUrl?: string | null;
};

type MatchRow = {
  id: string;
  candidateId: string;
  overallScore: number;
  skillsScore: number;
  titleScore: number;
  locationScore: number;
  gpaScore: number;
  industryScore: number;
  preferenceScore: number;
  anchorSkillScore?: number;
  authorizationScore?: number;
  majorFitScore?: number;
  semanticScore: number | null;
  explanation: string;
  strengths: string[];
  gaps: string[];
  recruiterSummary?: RecruiterSummary | null;
  scoreDebug?: {
    matchedTitleSignals?: string[];
    matchedRequiredSkills?: string[];
    functionAlignmentScore?: number;
    experienceEvidenceScore?: number;
    authorizationScore?: number;
    canonicalRole?: string;
    roleFamily?: string;
    roleSpecialization?: string;
    roleDistance?: string;
    roleDistanceScore?: number;
    penaltiesApplied?: string[];
    scoreCapsApplied?: string[];
    requiredTools?: string[];
    domainKeywords?: string[];
    eligibility?: { eligibilityStatus?: string; gatingReasons?: string[] };
    anchorSkillsUsed?: string[];
    matchedAnchors?: string[];
    candidateCanonicalRole?: string;
  } | null;
  candidatePreview?: CandidatePreview | null;
};

type CandidateNoteMeta = {
  count: number;
  latestSnippet: string | null;
};
type CandidateReviewMeta = {
  pending: number;
  completed: number;
};
type CandidateSurfaceFilter = "RECOMMENDED" | "SHORTLISTED" | "CONTACTED" | "PIPELINE";

function fitLabelForScore(score: number): RecruiterSummary["fitLabel"] {
  if (score >= 75) return "Strong fit";
  if (score >= 55) return "Good fit";
  if (score >= 30) return "Stretch fit";
  return "Low fit";
}

function fitBadgeClasses(fitLabel: RecruiterSummary["fitLabel"]): string {
  if (fitLabel === "Strong fit") return recruiterBadge.positive;
  if (fitLabel === "Good fit") return "border border-sky-200 bg-sky-50 text-navy-900";
  if (fitLabel === "Stretch fit") return recruiterBadge.pending;
  return recruiterBadge.inactive;
}

function buildFallbackSummary(m: MatchRow): RecruiterSummary {
  const fitLabel = fitLabelForScore(m.overallScore);
  const fitReasonMap: Record<RecruiterSummary["fitLabel"], string> = {
    "Strong fit": "Strong professional match across role alignment, skills, and domain.",
    "Good fit": "Relevant background with several meaningful overlaps for this role.",
    "Stretch fit": "Some adjacent experience is present, but core requirements are still missing.",
    "Low fit": "Limited direct overlap with the required specialization.",
  };

  const strengths =
    m.strengths?.slice(0, 3).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean) || [];
  const gaps = m.gaps?.slice(0, 3).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean) || [];
  const headline = strengths.length || gaps.length
    ? `Candidate with ${String(strengths[0] || "some transferable strengths").replace(/[.!?]$/, "").toLowerCase()} but ${String(gaps[0] || "several qualifications are still unclear").replace(/[.!?]$/, "").toLowerCase()}.`
    : "Candidate profile with limited evidence available for a confident match decision.";

  return {
    headline,
    fitLabel,
    fitReason: fitReasonMap[fitLabel],
    strengths,
    gaps,
    riskNote:
      fitLabel === "Stretch fit"
        ? "Would likely require ramp-up to handle role-specific requirements."
        : fitLabel === "Low fit"
          ? "Not a strong profile match based on currently available signals."
          : undefined,
  };
}

function tierForScore(score: number): "top" | "strong" | "potential" | "low" {
  if (score >= 85) return "top";
  if (score >= 70) return "strong";
  if (score >= 50) return "potential";
  return "low";
}

export default function JobMatchesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const { user, profile } = useFirebaseAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [pipelineByCandidateId, setPipelineByCandidateId] = useState<Record<string, any>>({});
  const [actionBusyCandidateId, setActionBusyCandidateId] = useState<string | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStage, setBulkStage] = useState<PipelineStage>("SHORTLIST");
  const [noteMetaByCandidateId, setNoteMetaByCandidateId] = useState<Record<string, CandidateNoteMeta>>({});
  const [reviewMetaByCandidateId, setReviewMetaByCandidateId] = useState<Record<string, CandidateReviewMeta>>({});
  const [surfaceFilter, setSurfaceFilter] = useState<CandidateSurfaceFilter>("RECOMMENDED");

  useEffect(() => {
    const f = (searchParams.get("filter") || "").toUpperCase();
    if (f === "SHORTLISTED" || f === "SHORTLIST") setSurfaceFilter("SHORTLISTED");
    else if (f === "CONTACTED") setSurfaceFilter("CONTACTED");
    else if (f === "PIPELINE" || f === "IN_PIPELINE") setSurfaceFilter("PIPELINE");
  }, [searchParams]);

  useEffect(() => {
    if (!user || !profile || (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER")) {
      router.push("/auth/login");
    }
  }, [user, profile, router]);

  const load = async () => {
    if (!user || !jobId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/job/${jobId}/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to load matches");
      }
      const data = await res.json();
      setJob(data.job);
      setMatches(data.matches || []);
      const candidateIds: string[] = Array.from(
        new Set((Array.isArray(data.matches) ? data.matches : []).map((m: any) => String(m.candidateId || "")).filter(Boolean))
      );
      if (candidateIds.length > 0) {
        const notePairs = await Promise.all(
          candidateIds.map(async (candidateId) => {
            const { data: notes } = await getRecruiterNotes(jobId, candidateId);
            const list = notes || [];
            return [
              candidateId,
              {
                count: list.length,
                latestSnippet: list[0]?.body ? String(list[0].body).slice(0, 100) : null,
              } as CandidateNoteMeta,
            ] as const;
          })
        );
        setNoteMetaByCandidateId(Object.fromEntries(notePairs));
      } else {
        setNoteMetaByCandidateId({});
      }
      const reviewsRes = await fetchReviewAssignments(jobId, token);
      if (reviewsRes.ok) {
        const byCandidate: Record<string, CandidateReviewMeta> = {};
        for (const assignment of reviewsRes.data.assignments || []) {
          const cid = String((assignment as any).candidateId || "");
          if (!cid) continue;
          if (!byCandidate[cid]) byCandidate[cid] = { pending: 0, completed: 0 };
          if (String((assignment as any).status || "") === "REQUESTED") byCandidate[cid].pending += 1;
          if (String((assignment as any).status || "") === "COMPLETED") byCandidate[cid].completed += 1;
        }
        setReviewMetaByCandidateId(byCandidate);
      } else {
        setReviewMetaByCandidateId({});
      }

      const pipelineRes = await fetch(`/api/job/${jobId}/pipeline`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pipelinePayload = await pipelineRes.json().catch(() => ({}));
      if (pipelineRes.ok && Array.isArray(pipelinePayload.entries)) {
        const byCandidate: Record<string, any> = {};
        for (const entry of pipelinePayload.entries as any[]) {
          byCandidate[entry.candidateId] = {
            ...entry,
            stage: normalizePipelineStage(entry.stage),
          };
        }
        setPipelineByCandidateId(byCandidate);
      } else {
        setPipelineByCandidateId({});
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, jobId]);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => Number(b.overallScore || 0) - Number(a.overallScore || 0)),
    [matches]
  );
  const visibleSortedMatches = useMemo(
    () => sortedMatches.filter((m) => (pipelineByCandidateId[m.candidateId]?.stage || "NEW") !== "REJECTED"),
    [sortedMatches, pipelineByCandidateId]
  );
  const scopedMatches = useMemo(() => {
    return visibleSortedMatches.filter((m) => {
      const stage = normalizePipelineStage(pipelineByCandidateId[m.candidateId]?.stage || "NEW");
      if (surfaceFilter === "RECOMMENDED") return stage === "NEW";
      if (surfaceFilter === "SHORTLISTED") return stage === "SHORTLIST";
      if (surfaceFilter === "CONTACTED") return stage === "CONTACTED";
      return stage !== "NEW" && stage !== "REJECTED";
    });
  }, [visibleSortedMatches, pipelineByCandidateId, surfaceFilter]);

  const focusNextCandidate = (candidateId: string) => {
    const currentIndex = visibleSortedMatches.findIndex((m) => m.candidateId === candidateId);
    if (currentIndex < 0) return;
    const next = visibleSortedMatches[currentIndex + 1];
    if (!next) return;
    const el = document.getElementById(`match-card-${next.candidateId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const grouped = useMemo(() => {
    const top: MatchRow[] = [];
    const strong: MatchRow[] = [];
    const potential: MatchRow[] = [];
    const other: MatchRow[] = [];
    for (const m of scopedMatches) {
      const t = tierForScore(m.overallScore);
      if (t === "top") top.push(m);
      else if (t === "strong") strong.push(m);
      else if (t === "potential") potential.push(m);
      else other.push(m);
    }
    return { top, strong, potential, other };
  }, [scopedMatches]);

  const rankMap = useMemo(() => {
    const map: Record<string, number> = {};
    visibleSortedMatches.forEach((m, i) => {
      map[m.id] = i + 1;
    });
    return map;
  }, [visibleSortedMatches]);

  const handleRerun = async () => {
    if (!user) return;
    setRerunLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/job/${jobId}/rerun-matches`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Rerun failed");
      toast.success("Done", "Matches refreshed");
      await load();
    } catch {
      toast.error("Error", "Could not rerun matches");
    } finally {
      setRerunLoading(false);
    }
  };

  const updatePipelineForCandidate = async (
    candidateId: string,
    updates: {
      stage?: PipelineStage;
      lastContactedAt?: Date | null;
      nextFollowUpAt?: Date | null;
    }
  ) => {
    if (!user) return false;
    setActionBusyCandidateId(candidateId);
    try {
      const token = await user.getIdToken();
      const body: Record<string, unknown> = { candidateId };
      if (updates.stage !== undefined) {
        body.stage = updates.stage;
      }
      if (updates.lastContactedAt !== undefined) {
        body.lastContactedAt = updates.lastContactedAt ? updates.lastContactedAt.toISOString() : null;
      }
      if (updates.nextFollowUpAt !== undefined) {
        body.nextFollowUpAt = updates.nextFollowUpAt ? updates.nextFollowUpAt.toISOString() : null;
      }
      const res = await fetch(`/api/job/${jobId}/pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.entry?.id) {
        toast.error("Error", payload?.error || "Failed to update pipeline");
        return false;
      }

      const existing = pipelineByCandidateId[candidateId];
      const stage = normalizePipelineStage(
        updates.stage !== undefined
          ? updates.stage
          : (payload.entry as any)?.stage ?? existing?.stage ?? "NEW"
      );
      const id = payload.entry.id as string;
      setPipelineByCandidateId((prev) => ({
        ...prev,
        [candidateId]: {
          ...(existing || {}),
          id,
          candidateId,
          jobId,
          ...(payload.entry || {}),
          stage,
          lastContactedAt: updates.lastContactedAt ?? payload.entry?.lastContactedAt ?? existing?.lastContactedAt ?? null,
          nextFollowUpAt: updates.nextFollowUpAt ?? payload.entry?.nextFollowUpAt ?? existing?.nextFollowUpAt ?? null,
        },
      }));
      if (stage === "REJECTED") {
        setSelectedCandidateIds((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
      return true;
    } finally {
      setActionBusyCandidateId(null);
    }
  };

  const allCandidateIds = useMemo(() => visibleSortedMatches.map((m) => m.candidateId), [visibleSortedMatches]);
  const allSelected = allCandidateIds.length > 0 && allCandidateIds.every((id) => selectedCandidateIds.has(id));

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedCandidateIds((prev) => {
      if (allSelected || prev.size === allCandidateIds.length) return new Set();
      return new Set(allCandidateIds);
    });
  };

  const runBulkStageUpdate = async (stage: PipelineStage) => {
    if (selectedCandidateIds.size === 0) return;
    setBulkBusy(true);
    try {
      for (const candidateId of selectedCandidateIds) {
        await updatePipelineForCandidate(candidateId, { stage });
      }
      toast.success(
        "Updated",
        `Moved ${selectedCandidateIds.size} candidate(s) to ${pipelineStageLabel(stage)}`
      );
      setSelectedCandidateIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  const launchCompare = () => {
    const ids = Array.from(selectedCandidateIds).slice(0, 4);
    if (ids.length < 2) {
      toast.error("Compare", "Select at least 2 candidates to compare");
      return;
    }
    router.push(getJobCompareUrl(jobId, ids));
  };

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* FIX5: max-w-7xl matches other job workspace tabs · FIX7: title + actions share one surface */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600">
            <Loader2 className="h-10 w-10 animate-spin text-navy-600 mb-4" />
            <p>Loading candidates…</p>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-navy-900 mb-2">Recommended candidates</h1>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        {job?.location ||
                          (job?.locationCity && job?.locationState
                            ? `${job.locationCity}, ${job.locationState}`
                            : "Location TBD")}
                      </span>
                      {job?.industry && <span className="text-slate-500">• {job.industry}</span>}
                      {job?.employment && (
                        <span className="text-slate-500">• {String(job.employment).replace(/_/g, " ")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => router.push(getCandidatesSearchUrl(jobId))}
                      className={recruiterBtnSecondarySm}
                    >
                      Source
                    </button>
                    <button
                      type="button"
                      onClick={handleRerun}
                      disabled={rerunLoading}
                      className={`${recruiterBtnSecondarySm} inline-flex items-center gap-2`}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${rerunLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>
                {job?.aiSummary && (
                  <p className="text-slate-700 text-sm leading-relaxed border-t border-slate-100 mt-4 pt-4">
                    {job.aiSummary}
                  </p>
                )}
              </div>

              <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Filter</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["RECOMMENDED", "Recommended"],
                      ["SHORTLISTED", "Shortlisted"],
                      ["CONTACTED", "Contacted"],
                      ["PIPELINE", "In pipeline"],
                    ] as const
                  ).map(([key, label]) => {
                    const count = visibleSortedMatches.filter((m) => {
                      const stage = normalizePipelineStage(pipelineByCandidateId[m.candidateId]?.stage || "NEW");
                      if (key === "RECOMMENDED") return stage === "NEW";
                      if (key === "SHORTLISTED") return stage === "SHORTLIST";
                      if (key === "CONTACTED") return stage === "CONTACTED";
                      return stage !== "NEW" && stage !== "REJECTED";
                    }).length;
                    const active = surfaceFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSurfaceFilter(key)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-navy-800 text-white"
                            : "border border-slate-200 bg-white text-navy-900 hover:bg-slate-50"
                        }`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {scopedMatches.length > 0 && (
                <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Compare shortlist</p>
                    <p className="text-xs text-slate-600 mt-0.5">Select 2–4 contenders, then compare.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={toggleSelectAll} className={recruiterBtnSecondarySm}>
                      {allSelected ? "Clear selection" : "Select all in view"}
                    </button>
                    <button
                      type="button"
                      onClick={launchCompare}
                      disabled={selectedCandidateIds.size < 2}
                      className={`${recruiterBtnPrimary} text-xs px-3 py-2 disabled:opacity-50`}
                    >
                      Compare {selectedCandidateIds.size > 0 ? `(${selectedCandidateIds.size})` : ""}
                    </button>
                  </div>
                </div>
              )}

              {selectedCandidateIds.size > 0 && (
                <div className="px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-navy-800 text-white">
                  <p className="text-sm font-medium">
                    {selectedCandidateIds.size} selected
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => runBulkStageUpdate("SHORTLIST")}
                      disabled={bulkBusy}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Shortlist
                    </button>
                    <button
                      type="button"
                      onClick={() => runBulkStageUpdate("REJECTED")}
                      disabled={bulkBusy}
                      className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <select
                      value={bulkStage}
                      onChange={(e) => setBulkStage(e.target.value as PipelineStage)}
                      disabled={bulkBusy}
                      className="rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-xs text-white"
                    >
                      {PIPELINE_STAGES.map((stage) => (
                        <option key={stage} value={stage} className="text-navy-900">
                          Move to {pipelineStageLabel(stage)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => runBulkStageUpdate(bulkStage)}
                      disabled={bulkBusy}
                      className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-sky-200 disabled:opacity-60"
                    >
                      Apply stage
                    </button>
                    <button
                      type="button"
                      onClick={launchCompare}
                      disabled={bulkBusy}
                      className="rounded-lg border border-white/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      Compare selected
                    </button>
                  </div>
                </div>
              )}
            </div>

            <MatchSection
              jobId={jobId}
              title="Top recommended candidates"
              subtitle="Score 85+"
              items={grouped.top}
              rankMap={rankMap}
              pipelineByCandidateId={pipelineByCandidateId}
              actionBusyCandidateId={actionBusyCandidateId}
              selectedCandidateIds={selectedCandidateIds}
              onToggleSelection={toggleCandidateSelection}
              onShortlist={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "SHORTLIST" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onReject={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "REJECTED" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onMessage={async (candidateId) => {
                await updatePipelineForCandidate(candidateId, { stage: "CONTACTED", lastContactedAt: new Date() });
                router.push(`${getCandidateUrl(candidateId, jobId)}&action=message`);
              }}
              noteMetaByCandidateId={noteMetaByCandidateId}
              reviewMetaByCandidateId={reviewMetaByCandidateId}
            />
            <MatchSection
              jobId={jobId}
              title="Strong recommended candidates"
              subtitle="Score 70–84"
              items={grouped.strong}
              rankMap={rankMap}
              pipelineByCandidateId={pipelineByCandidateId}
              actionBusyCandidateId={actionBusyCandidateId}
              selectedCandidateIds={selectedCandidateIds}
              onToggleSelection={toggleCandidateSelection}
              onShortlist={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "SHORTLIST" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onReject={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "REJECTED" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onMessage={async (candidateId) => {
                await updatePipelineForCandidate(candidateId, { stage: "CONTACTED", lastContactedAt: new Date() });
                router.push(`${getCandidateUrl(candidateId, jobId)}&action=message`);
              }}
              noteMetaByCandidateId={noteMetaByCandidateId}
              reviewMetaByCandidateId={reviewMetaByCandidateId}
            />
            <MatchSection
              jobId={jobId}
              title="Potential candidates"
              subtitle="Score 50–69"
              items={grouped.potential}
              rankMap={rankMap}
              pipelineByCandidateId={pipelineByCandidateId}
              actionBusyCandidateId={actionBusyCandidateId}
              selectedCandidateIds={selectedCandidateIds}
              onToggleSelection={toggleCandidateSelection}
              onShortlist={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "SHORTLIST" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onReject={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "REJECTED" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onMessage={async (candidateId) => {
                await updatePipelineForCandidate(candidateId, { stage: "CONTACTED", lastContactedAt: new Date() });
                router.push(`${getCandidateUrl(candidateId, jobId)}&action=message`);
              }}
              noteMetaByCandidateId={noteMetaByCandidateId}
              reviewMetaByCandidateId={reviewMetaByCandidateId}
            />
            <MatchSection
              jobId={jobId}
              title="Other candidates"
              subtitle="Score below 50"
              items={grouped.other}
              rankMap={rankMap}
              pipelineByCandidateId={pipelineByCandidateId}
              actionBusyCandidateId={actionBusyCandidateId}
              selectedCandidateIds={selectedCandidateIds}
              onToggleSelection={toggleCandidateSelection}
              onShortlist={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "SHORTLIST" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onReject={async (candidateId) => {
                const ok = await updatePipelineForCandidate(candidateId, { stage: "REJECTED" });
                if (ok) focusNextCandidate(candidateId);
              }}
              onMessage={async (candidateId) => {
                await updatePipelineForCandidate(candidateId, { stage: "CONTACTED", lastContactedAt: new Date() });
                router.push(`${getCandidateUrl(candidateId, jobId)}&action=message`);
              }}
              noteMetaByCandidateId={noteMetaByCandidateId}
              reviewMetaByCandidateId={reviewMetaByCandidateId}
            />

            {scopedMatches.length === 0 && (
              <div className="text-center py-16 text-slate-600 bg-white rounded-2xl border border-slate-200">
                <p className="mb-2">No candidates in this view yet.</p>
                <p className="text-sm">Try another filter or refresh recommendations.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MatchSection({
  jobId,
  title,
  subtitle,
  items,
  rankMap,
  pipelineByCandidateId,
  actionBusyCandidateId,
  selectedCandidateIds,
  onToggleSelection,
  onShortlist,
  onReject,
  onMessage,
  noteMetaByCandidateId,
  reviewMetaByCandidateId,
}: {
  jobId: string;
  title: string;
  subtitle: string;
  items: MatchRow[];
  rankMap: Record<string, number>;
  pipelineByCandidateId: Record<string, any>;
  actionBusyCandidateId: string | null;
  selectedCandidateIds: Set<string>;
  onToggleSelection: (candidateId: string) => void;
  onShortlist: (candidateId: string) => Promise<void>;
  onReject: (candidateId: string) => Promise<void>;
  onMessage: (candidateId: string) => Promise<void>;
  noteMetaByCandidateId: Record<string, CandidateNoteMeta>;
  reviewMetaByCandidateId: Record<string, CandidateReviewMeta>;
}) {
  if (!items.length) return null;
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
        <p className="text-xs text-slate-400 font-normal">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {items.map((m) => (
          <MatchCard
            key={m.id}
            jobId={jobId}
            m={m}
            rank={rankMap[m.id] || 0}
            pipelineEntry={pipelineByCandidateId[m.candidateId] || null}
            actionBusy={actionBusyCandidateId === m.candidateId}
            selected={selectedCandidateIds.has(m.candidateId)}
            onToggleSelection={() => onToggleSelection(m.candidateId)}
            onShortlist={() => onShortlist(m.candidateId)}
            onReject={() => onReject(m.candidateId)}
            onMessage={() => onMessage(m.candidateId)}
            noteMeta={noteMetaByCandidateId[m.candidateId]}
            reviewMeta={reviewMetaByCandidateId[m.candidateId]}
          />
        ))}
      </div>
    </section>
  );
}

function MatchCard({
  jobId,
  m,
  rank: _rank,
  pipelineEntry,
  actionBusy,
  selected,
  onToggleSelection,
  onShortlist,
  onReject,
  onMessage,
  noteMeta,
  reviewMeta,
}: {
  jobId: string;
  m: MatchRow;
  rank: number; // retained for API compatibility; not shown in simplified cards
  pipelineEntry: any | null;
  actionBusy: boolean;
  selected: boolean;
  onToggleSelection: () => void;
  onShortlist: () => Promise<void>;
  onReject: () => Promise<void>;
  onMessage: () => Promise<void>;
  noteMeta?: CandidateNoteMeta;
  reviewMeta?: CandidateReviewMeta;
}) {
  const [showWhyMatch, setShowWhyMatch] = useState(false);
  const preview = m.candidatePreview;
  const name =
    preview?.firstName || preview?.lastName
      ? `${preview?.firstName || ""} ${preview?.lastName || ""}`.trim()
      : "Candidate";
  const headline = preview?.headline || preview?.school || "";
  const recruiterSummary = m.recruiterSummary || buildFallbackSummary(m);

  const inPipeline = Boolean(pipelineEntry?.id);
  const currentStage = normalizePipelineStage(pipelineEntry?.stage);
  const nextStepLine = getRecruiterNextStep({
    pipelineStage: inPipeline ? currentStage : "NEW",
  });
  const topSignals = (recruiterSummary.strengths || m.strengths || []).slice(0, 2);
  const topGap = recruiterSummary.gaps?.[0] || m.gaps?.[0] || recruiterSummary.riskNote;

  let primaryAction: "shortlist" | "message" | "profile" = "shortlist";
  if (!inPipeline || currentStage === "NEW") primaryAction = "shortlist";
  else if (currentStage === "REJECTED") primaryAction = "profile";
  else if (
    currentStage === "SHORTLIST" ||
    currentStage === "CONTACTED" ||
    currentStage === "RESPONDED" ||
    currentStage === "INTERVIEW" ||
    currentStage === "FINALIST"
  )
    primaryAction = "message";
  else primaryAction = "shortlist";

  return (
    <article
      id={`match-card-${m.candidateId}`}
      className={`bg-white rounded-xl border shadow-sm p-5 sm:p-6 ${selected ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelection}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            aria-label={`Select ${name}`}
          />
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-navy-700" />
          </div>
          <div>
            <h3 className="text-base font-medium text-navy-900">{name}</h3>
            {headline && <p className="text-sm text-slate-700 line-clamp-2">{headline}</p>}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xl font-bold text-navy-800">{Math.round(m.overallScore)}%</div>
          <div className="text-xs text-slate-400 font-normal">Match score</div>
        </div>
      </div>

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setShowWhyMatch((v) => !v)}
          className={`${recruiterBtnGhost} text-xs font-semibold`}
        >
          {showWhyMatch ? "Hide match detail" : "Why this match?"}
        </button>
        {showWhyMatch && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <ScorePill label="Skills overlap" v={m.skillsScore} />
            <ScorePill label="Role alignment" v={m.titleScore} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4">
        <p className="text-sm font-semibold text-navy-900 mb-2">{recruiterSummary.headline}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${fitBadgeClasses(recruiterSummary.fitLabel)}`}>
            {recruiterSummary.fitLabel}
          </span>
          <p className="text-slate-700">{recruiterSummary.fitReason}</p>
        </div>
      </div>

      {(topSignals.length > 0 || topGap) && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`rounded-lg px-3 py-2 ${recruiterBadge.positive}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1">Top strengths</p>
            {topSignals.length > 0 ? (
              <ul className="text-sm text-slate-800 space-y-1">
                {topSignals.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">No strong evidence surfaced yet.</p>
            )}
          </div>
          <div className={`rounded-lg px-3 py-2 ${recruiterBadge.pending}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1">Primary risk</p>
            <p className="text-sm">{topGap || "No major risks highlighted."}</p>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
              inPipeline
                ? currentStage === "SHORTLIST"
                  ? recruiterBadge.positive
                  : currentStage === "REJECTED"
                    ? recruiterBadge.inactive
                    : recruiterBadge.pending
                : recruiterBadge.inactive
            }`}
          >
            {inPipeline ? `Pipeline · ${pipelineStageLabel(currentStage)}` : "Not in pipeline"}
          </span>
          {currentStage === "SHORTLIST" && inPipeline && (
            <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${recruiterBadge.positive}`}>
              Working set
            </span>
          )}
          {preview?.resumeUrl ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-normal">
              <FileText className="h-3.5 w-3.5 text-slate-400" /> Resume
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-normal">
              <FileText className="h-3.5 w-3.5" /> No resume
            </span>
          )}
          {preview?.videoUrl ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-normal">
              <Video className="h-3.5 w-3.5 text-slate-400" /> Video
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-normal">
              <Video className="h-3.5 w-3.5" /> No video
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
              (noteMeta?.count || 0) > 0 ? recruiterBadge.neutral : recruiterBadge.inactive
            }`}
          >
            {(noteMeta?.count || 0) > 0 ? `${noteMeta?.count} note${noteMeta?.count === 1 ? "" : "s"}` : "No notes"}
          </span>
          {noteMeta?.latestSnippet && (
            <span className="text-xs text-slate-400 max-w-xs truncate font-normal" title={noteMeta.latestSnippet}>
              {noteMeta.latestSnippet}
            </span>
          )}
          {(reviewMeta?.pending || 0) > 0 && (
            <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${recruiterBadge.pending}`}>
              Review pending
            </span>
          )}
          {(reviewMeta?.completed || 0) > 0 && (
            <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${recruiterBadge.positive}`}>
              Feedback received
            </span>
          )}
        </div>
        <p className="text-xs text-navy-900 font-medium">{nextStepLine}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {primaryAction === "shortlist" && (
              <button type="button" onClick={onShortlist} disabled={actionBusy} className={`${recruiterBtnPrimaryLg} w-full sm:w-auto`}>
                {inPipeline ? "Move to shortlist" : "Add to shortlist"}
              </button>
            )}
            {primaryAction === "message" && (
              <button type="button" onClick={onMessage} disabled={actionBusy} className={`${recruiterBtnPrimaryLg} w-full sm:w-auto inline-flex gap-2`}>
                <MessageSquare className="h-5 w-5 shrink-0" />
                Message
              </button>
            )}
            {primaryAction === "profile" && (
              <Link href={getCandidateUrl(m.candidateId, jobId)} className={`${recruiterBtnPrimaryLg} w-full sm:w-auto text-center`}>
                View profile
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {primaryAction !== "message" && currentStage !== "REJECTED" && (
              <button type="button" onClick={onMessage} disabled={actionBusy} className={recruiterBtnSecondarySm}>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </span>
              </button>
            )}
            {currentStage !== "REJECTED" && (
              <Link href={getCandidateUrl(m.candidateId, jobId)} className={recruiterBtnSecondarySm}>
                Profile
              </Link>
            )}
            <button type="button" onClick={onReject} disabled={actionBusy} className={`${recruiterBtnGhost} text-xs`}>
              Reject
            </button>
            <AddToTalentPoolButton
              candidateId={m.candidateId}
              alignUp
              buttonClassName={`${recruiterBtnGhost} text-xs border border-dashed border-slate-300`}
            />
            {inPipeline && (
              <SendCandidateForReviewButton
                jobId={jobId}
                candidateId={m.candidateId}
                candidateName={name}
                buttonClassName={recruiterBtnSecondarySm}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ScorePill({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold text-navy-800">{Math.round(v)}</div>
    </div>
  );
}
