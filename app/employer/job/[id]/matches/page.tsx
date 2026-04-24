"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

function fitLabelForScore(score: number): RecruiterSummary["fitLabel"] {
  if (score >= 75) return "Strong fit";
  if (score >= 55) return "Good fit";
  if (score >= 30) return "Stretch fit";
  return "Low fit";
}

function fitBadgeClasses(fitLabel: RecruiterSummary["fitLabel"]): string {
  if (fitLabel === "Strong fit") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (fitLabel === "Good fit") return "bg-sky-50 text-sky-700 border-sky-100";
  if (fitLabel === "Stretch fit") return "bg-amber-50 text-amber-800 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
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
    for (const m of visibleSortedMatches) {
      const t = tierForScore(m.overallScore);
      if (t === "top") top.push(m);
      else if (t === "strong") strong.push(m);
      else if (t === "potential") potential.push(m);
      else other.push(m);
    }
    return { top, strong, potential, other };
  }, [visibleSortedMatches]);

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

  const handleMoveStage = async (candidateId: string, newStage: PipelineStage) => {
    const ok = await updatePipelineForCandidate(candidateId, { stage: newStage });
    if (ok) focusNextCandidate(candidateId);
    return ok;
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
      toast.success("Updated", `Moved ${selectedCandidateIds.size} candidate(s) to ${stage}`);
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

  const matchStatus = job?.matchStatus as string | undefined;
  const matchError = job?.matchError as string | undefined;

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(getCandidatesSearchUrl(jobId))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 text-sm font-medium hover:bg-slate-50"
          >
            Find more candidates
          </button>
          <button
            type="button"
            onClick={handleRerun}
            disabled={rerunLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-navy-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${rerunLoading ? "animate-spin" : ""}`} />
            Rerun matches
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600">
            <Loader2 className="h-10 w-10 animate-spin text-navy-600 mb-4" />
            <p>Loading matches…</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-6">
              <h1 className="text-lg sm:text-xl font-bold text-navy-900 mb-2">Match triage</h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-4">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job?.location ||
                    (job?.locationCity && job?.locationState
                      ? `${job.locationCity}, ${job.locationState}`
                      : "Location TBD")}
                </span>
                {job?.industry && <span>• {job.industry}</span>}
                {job?.employment && <span>• {String(job.employment).replace(/_/g, " ")}</span>}
              </div>
              {job?.aiSummary && (
                <p className="text-slate-700 text-sm leading-relaxed border-t border-slate-100 pt-4">
                  {job.aiSummary}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span
                  className={`px-2 py-1 rounded-full font-medium ${
                    matchStatus === "complete"
                      ? "bg-green-100 text-green-800"
                      : matchStatus === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-900"
                  }`}
                >
                  Matching: {matchStatus || "unknown"}
                </span>
                {matchError && (
                  <span className="text-red-600 text-xs self-center">Last error: {matchError}</span>
                )}
              </div>
            </div>

            {visibleSortedMatches.length > 0 && (
              <section className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg sm:text-xl font-bold text-navy-900">All evaluated candidates</h2>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs sm:text-sm font-medium text-sky-700 hover:text-sky-800"
                    >
                      {allSelected ? "Clear selection" : "Select all"}
                    </button>
                    <span className="text-xs sm:text-sm text-slate-500">{visibleSortedMatches.length} shown</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {visibleSortedMatches.map((m) => (
                    <div
                      key={`row-${m.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-sm text-slate-700">
                        <span className="font-semibold text-navy-800 mr-2">#{rankMap[m.id]}</span>
                        {(m.candidatePreview?.firstName || m.candidatePreview?.lastName)
                          ? `${m.candidatePreview?.firstName || ""} ${m.candidatePreview?.lastName || ""}`.trim()
                          : "Candidate"}
                      </div>
                      <div className="text-sm font-semibold text-navy-800">{Math.round(m.overallScore)}%</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {visibleSortedMatches.length > 0 && (
              <section className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-900">Build a shortlist compare set</p>
                    <p className="text-xs text-violet-800">
                      Select contenders, move to shortlist, then compare 2-4 side-by-side.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={launchCompare}
                    disabled={selectedCandidateIds.size < 2}
                    className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                  >
                    Compare {selectedCandidateIds.size > 0 ? `(${selectedCandidateIds.size})` : ""}
                  </button>
                </div>
              </section>
            )}

            {selectedCandidateIds.size > 0 && (
              <section className="mb-6 bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
                <p className="text-sm font-medium">
                  {selectedCandidateIds.size} candidate{selectedCandidateIds.size === 1 ? "" : "s"} selected
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => runBulkStageUpdate("SHORTLIST")}
                    disabled={bulkBusy}
                    className="px-3 py-1.5 rounded-lg bg-white text-navy-900 text-xs font-semibold hover:bg-slate-100 disabled:opacity-60"
                  >
                    Shortlist
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkStageUpdate("REJECTED")}
                    disabled={bulkBusy}
                    className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-semibold hover:bg-rose-200 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <select
                    value={bulkStage}
                    onChange={(e) => setBulkStage(e.target.value as PipelineStage)}
                    disabled={bulkBusy}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                  >
                    {PIPELINE_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        Move to {stage}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => runBulkStageUpdate(bulkStage)}
                    disabled={bulkBusy}
                    className="px-3 py-1.5 rounded-lg bg-sky-100 text-sky-800 text-xs font-semibold hover:bg-sky-200 disabled:opacity-60"
                  >
                    Apply stage
                  </button>
                  <button
                    type="button"
                    onClick={launchCompare}
                    disabled={bulkBusy}
                    className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 text-xs font-semibold hover:bg-violet-200 disabled:opacity-60"
                  >
                    Compare selected
                  </button>
                </div>
              </section>
            )}

            <MatchSection
              jobId={jobId}
              title="Top matches"
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
                router.push(getCandidateUrl(candidateId, jobId));
              }}
              onMoveStage={handleMoveStage}
              noteMetaByCandidateId={noteMetaByCandidateId}
            />
            <MatchSection
              jobId={jobId}
              title="Strong matches"
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
                router.push(getCandidateUrl(candidateId, jobId));
              }}
              onMoveStage={handleMoveStage}
              noteMetaByCandidateId={noteMetaByCandidateId}
            />
            <MatchSection
              jobId={jobId}
              title="Potential matches"
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
                router.push(getCandidateUrl(candidateId, jobId));
              }}
              onMoveStage={handleMoveStage}
              noteMetaByCandidateId={noteMetaByCandidateId}
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
                router.push(getCandidateUrl(candidateId, jobId));
              }}
              onMoveStage={handleMoveStage}
              noteMetaByCandidateId={noteMetaByCandidateId}
            />

            {visibleSortedMatches.length === 0 && (
              <div className="text-center py-16 text-slate-600 bg-white rounded-2xl border border-slate-200">
                <p className="mb-2">No scored matches yet.</p>
                <p className="text-sm">Try “Rerun matches” in a few seconds if the job was just created.</p>
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
  onMoveStage,
  noteMetaByCandidateId,
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
  onMoveStage: (candidateId: string, stage: PipelineStage) => Promise<boolean | void>;
  noteMetaByCandidateId: Record<string, CandidateNoteMeta>;
}) {
  if (!items.length) return null;
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-navy-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
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
            onMoveStage={(stage) => onMoveStage(m.candidateId, stage)}
            noteMeta={noteMetaByCandidateId[m.candidateId]}
          />
        ))}
      </div>
    </section>
  );
}

function MatchCard({
  jobId,
  m,
  rank,
  pipelineEntry,
  actionBusy,
  selected,
  onToggleSelection,
  onShortlist,
  onReject,
  onMessage,
  onMoveStage,
  noteMeta,
}: {
  jobId: string;
  m: MatchRow;
  rank: number;
  pipelineEntry: any | null;
  actionBusy: boolean;
  selected: boolean;
  onToggleSelection: () => void;
  onShortlist: () => Promise<void>;
  onReject: () => Promise<void>;
  onMessage: () => Promise<void>;
  onMoveStage: (stage: PipelineStage) => Promise<boolean | void>;
  noteMeta?: CandidateNoteMeta;
}) {
  const preview = m.candidatePreview;
  const name =
    preview?.firstName || preview?.lastName
      ? `${preview?.firstName || ""} ${preview?.lastName || ""}`.trim()
      : "Candidate";
  const headline = preview?.headline || preview?.school || "";
  const recruiterSummary = m.recruiterSummary || buildFallbackSummary(m);

  const inPipeline = Boolean(pipelineEntry?.id);
  const currentStage = normalizePipelineStage(pipelineEntry?.stage);
  const topSignals = (recruiterSummary.strengths || m.strengths || []).slice(0, 2);
  const topGap = recruiterSummary.gaps?.[0] || m.gaps?.[0] || recruiterSummary.riskNote;

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
            <h3 className="font-semibold text-navy-900 text-lg">{name}</h3>
            <p className="text-xs text-slate-500">Rank #{rank}</p>
            {headline && <p className="text-sm text-slate-600 line-clamp-2">{headline}</p>}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-2xl font-bold text-navy-800">{Math.round(m.overallScore)}%</div>
          <div className="text-xs text-slate-500">overall match</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
        <ScorePill label="Skills overlap" v={m.skillsScore} />
        <ScorePill label="Role alignment" v={m.titleScore} />
        <ScorePill label="Location match" v={m.locationScore} />
        <ScorePill label="Profile similarity" v={m.semanticScore ?? 0} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4">
        <p className="text-sm font-semibold text-navy-900 mb-2">{recruiterSummary.headline}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-medium ${fitBadgeClasses(recruiterSummary.fitLabel)}`}>
            {recruiterSummary.fitLabel}
          </span>
          <p className="text-slate-700">{recruiterSummary.fitReason}</p>
        </div>
      </div>

      {(topSignals.length > 0 || topGap) && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">Top strengths</p>
            {topSignals.length > 0 ? (
              <ul className="text-sm text-emerald-900 space-y-1">
                {topSignals.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-900/70">No strong evidence surfaced yet.</p>
            )}
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-1">Primary risk</p>
            <p className="text-sm text-amber-900">{topGap || "No major risks highlighted."}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
        <span
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
            inPipeline
              ? currentStage === "SHORTLIST"
                ? "bg-violet-50 text-violet-700 border-violet-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {inPipeline ? `In pipeline · ${currentStage}` : "Not yet in pipeline"}
        </span>
        {currentStage === "SHORTLIST" && (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-violet-200 bg-violet-100 text-violet-800 font-semibold">
            Working set contender
          </span>
        )}
        {preview?.resumeUrl ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            <FileText className="h-3.5 w-3.5 text-green-600" /> Resume
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <FileText className="h-3.5 w-3.5" /> No resume
          </span>
        )}
        {preview?.videoUrl ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            <Video className="h-3.5 w-3.5 text-sky-600" /> Video
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Video className="h-3.5 w-3.5" /> No video
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
            (noteMeta?.count || 0) > 0
              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
              : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          {(noteMeta?.count || 0) > 0 ? `${noteMeta?.count} note${noteMeta?.count === 1 ? "" : "s"}` : "No notes"}
        </span>
        {noteMeta?.latestSnippet && (
          <span className="text-xs text-slate-500 max-w-xs truncate" title={noteMeta.latestSnippet}>
            {noteMeta.latestSnippet}
          </span>
        )}
        <Link
          href={getCandidateUrl(m.candidateId, jobId)}
          className="ml-auto inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-navy-800 text-white text-sm font-medium hover:bg-navy-700"
        >
          View profile
        </Link>
        <button
          type="button"
          onClick={onShortlist}
          disabled={actionBusy}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 text-navy-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {inPipeline ? "Move to shortlist" : "Add to shortlist"}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={actionBusy}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-rose-200 text-rose-700 text-sm font-medium hover:bg-rose-50 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={onMessage}
          disabled={actionBusy}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 text-navy-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </button>
        <AddToTalentPoolButton candidateId={m.candidateId} alignUp />
        <select
          value={inPipeline ? currentStage : "NEW"}
          onChange={(e) => onMoveStage(e.target.value as PipelineStage)}
          disabled={actionBusy}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white disabled:opacity-50"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
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
