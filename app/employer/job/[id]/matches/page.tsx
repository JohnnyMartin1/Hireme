"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, RefreshCw, FileText, Video, MessageSquare, User } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";

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
  semanticScore: number | null;
  explanation: string;
  strengths: string[];
  gaps: string[];
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
  } | null;
  candidatePreview?: CandidatePreview | null;
};

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

  const grouped = useMemo(() => {
    const top: MatchRow[] = [];
    const strong: MatchRow[] = [];
    const potential: MatchRow[] = [];
    const other: MatchRow[] = [];
    for (const m of sortedMatches) {
      const t = tierForScore(m.overallScore);
      if (t === "top") top.push(m);
      else if (t === "strong") strong.push(m);
      else if (t === "potential") potential.push(m);
      else other.push(m);
    }
    return { top, strong, potential, other };
  }, [sortedMatches]);

  const rankMap = useMemo(() => {
    const map: Record<string, number> = {};
    sortedMatches.forEach((m, i) => {
      map[m.id] = i + 1;
    });
    return map;
  }, [sortedMatches]);

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

  if (!user || !profile) return null;

  const matchStatus = job?.matchStatus as string | undefined;
  const matchError = job?.matchError as string | undefined;

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <Link
            href={`/employer/job/${jobId}`}
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 min-h-[44px] px-2 rounded-lg hover:bg-sky-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium text-sm sm:text-base">Back to job</span>
          </Link>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600">
            <Loader2 className="h-10 w-10 animate-spin text-navy-600 mb-4" />
            <p>Loading matches…</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-2">{job?.title}</h1>
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

            <section className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg sm:text-xl font-bold text-navy-900">Parsing debug (temporary)</h2>
                <span className="text-xs sm:text-sm text-slate-500">Inspect AI vs fallback output</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <DebugList
                  label="Parsing source"
                  values={[String(job?.aiProcessingSource || "unknown")]}
                />
                <DebugList
                  label="Normalized title"
                  values={[String(job?.normalizedTitle || "n/a")]}
                />
                <DebugList
                  label="Required skills"
                  values={Array.isArray(job?.requiredSkills) ? job.requiredSkills : []}
                />
                <DebugList
                  label="Preferred skills"
                  values={Array.isArray(job?.preferredSkills) ? job.preferredSkills : []}
                />
                <DebugList
                  label="Keywords"
                  values={Array.isArray(job?.keywords) ? job.keywords : []}
                />
                <DebugList
                  label="Must-haves"
                  values={Array.isArray(job?.mustHaves) ? job.mustHaves : []}
                />
                <DebugList
                  label="Nice-to-haves"
                  values={Array.isArray(job?.niceToHaves) ? job.niceToHaves : []}
                />
                <DebugList
                  label="Job functions"
                  values={Array.isArray(job?.jobFunctions) ? job.jobFunctions : []}
                />
                <DebugList
                  label="Canonical role"
                  values={[String(job?.canonicalRole || job?.jobNormalization?.canonicalRole || "unknown")]}
                />
                <DebugList
                  label="Role family / specialization"
                  values={[
                    String(job?.roleFamily || job?.jobNormalization?.roleFamily || "unknown"),
                    String(job?.roleSpecialization || job?.jobNormalization?.roleSpecialization || "unknown"),
                  ]}
                />
                <DebugList
                  label="Hard requirements"
                  values={Array.isArray(job?.hardRequirements) ? job.hardRequirements : (Array.isArray(job?.jobNormalization?.hardRequirements) ? job.jobNormalization.hardRequirements : [])}
                />
                <DebugList
                  label="Required tools"
                  values={Array.isArray(job?.requiredTools) ? job.requiredTools : (Array.isArray(job?.jobNormalization?.requiredTools) ? job.jobNormalization.requiredTools : [])}
                />
                <DebugList
                  label="Domain keywords"
                  values={Array.isArray(job?.domainKeywords) ? job.domainKeywords : (Array.isArray(job?.jobNormalization?.domainKeywords) ? job.jobNormalization.domainKeywords : [])}
                />
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800">
                  Show raw normalized object JSON
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-xs overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(
  {
    aiProcessingSource: job?.aiProcessingSource,
    normalizedTitle: job?.normalizedTitle,
    requiredSkills: job?.requiredSkills || [],
    preferredSkills: job?.preferredSkills || [],
    keywords: job?.keywords || [],
    mustHaves: job?.mustHaves || [],
    niceToHaves: job?.niceToHaves || [],
    jobFunctions: job?.jobFunctions || [],
    jobNormalization: job?.jobNormalization || null,
  },
  null,
  2
)}
                </pre>
              </details>
            </section>

            {sortedMatches.length > 0 && (
              <section className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg sm:text-xl font-bold text-navy-900">All evaluated candidates</h2>
                  <span className="text-xs sm:text-sm text-slate-500">{sortedMatches.length} shown</span>
                </div>
                <div className="space-y-2">
                  {sortedMatches.map((m) => (
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

            <MatchSection title="Top matches" subtitle="Score 85+" items={grouped.top} rankMap={rankMap} />
            <MatchSection title="Strong matches" subtitle="Score 70–84" items={grouped.strong} rankMap={rankMap} />
            <MatchSection title="Potential matches" subtitle="Score 50–69" items={grouped.potential} rankMap={rankMap} />
            <MatchSection title="Other candidates" subtitle="Score below 50" items={grouped.other} rankMap={rankMap} />

            {sortedMatches.length === 0 && (
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

function DebugList({ label, values }: { label: string; values: string[] }) {
  const cleaned = values.map((v) => String(v || "").trim()).filter(Boolean);
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="text-slate-500 mb-1">{label}</div>
      {cleaned.length ? (
        <div className="flex flex-wrap gap-1.5">
          {cleaned.map((v, i) => (
            <span key={`${label}-${i}`} className="px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
              {v}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-slate-400">none</div>
      )}
    </div>
  );
}

function MatchSection({
  title,
  subtitle,
  items,
  rankMap,
}: {
  title: string;
  subtitle: string;
  items: MatchRow[];
  rankMap: Record<string, number>;
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
          <MatchCard key={m.id} m={m} rank={rankMap[m.id] || 0} />
        ))}
      </div>
    </section>
  );
}

function MatchCard({ m, rank }: { m: MatchRow; rank: number }) {
  const preview = m.candidatePreview;
  const name =
    preview?.firstName || preview?.lastName
      ? `${preview?.firstName || ""} ${preview?.lastName || ""}`.trim()
      : "Candidate";
  const headline = preview?.headline || preview?.school || "";

  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-4">
        <ScorePill label="Skills" v={m.skillsScore} />
        <ScorePill label="Title / role" v={m.titleScore} />
        <ScorePill label="Location" v={m.locationScore} />
        <ScorePill label="GPA" v={m.gpaScore} />
        <ScorePill label="Industry" v={m.industryScore} />
        <ScorePill label="Preferences" v={m.preferenceScore} />
        <ScorePill label="Semantic" v={m.semanticScore ?? 0} />
      </div>

      <p className="text-sm text-slate-700 leading-relaxed mb-4">{m.explanation}</p>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {m.scoreDebug?.matchedTitleSignals?.length ? (
          <span className="px-2 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
            Target role fit: {m.scoreDebug.matchedTitleSignals.slice(0, 2).join(", ")}
          </span>
        ) : null}
        {m.scoreDebug?.matchedRequiredSkills?.length ? (
          <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
            Skill evidence: {m.scoreDebug.matchedRequiredSkills.slice(0, 3).join(", ")}
          </span>
        ) : null}
        {typeof m.scoreDebug?.experienceEvidenceScore === "number" ? (
          <span className="px-2 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700">
            Experience evidence: {Math.round(m.scoreDebug.experienceEvidenceScore)}/100
          </span>
        ) : null}
        {typeof m.scoreDebug?.authorizationScore === "number" ? (
          <span className="px-2 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700">
            Authorization fit: {Math.round(m.scoreDebug.authorizationScore)}/100
          </span>
        ) : null}
        {m.scoreDebug?.roleDistance ? (
          <span className="px-2 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700">
            Role distance: {m.scoreDebug.roleDistance}
            {typeof m.scoreDebug.roleDistanceScore === "number"
              ? ` (${Math.round(m.scoreDebug.roleDistanceScore)})`
              : ""}
          </span>
        ) : null}
        {Array.isArray(m.scoreDebug?.penaltiesApplied) && m.scoreDebug.penaltiesApplied.length > 0 ? (
          <span className="px-2 py-1 rounded-full bg-red-50 border border-red-100 text-red-700">
            Penalties: {m.scoreDebug.penaltiesApplied.slice(0, 2).join(", ")}
          </span>
        ) : null}
        {Array.isArray(m.scoreDebug?.scoreCapsApplied) && m.scoreDebug.scoreCapsApplied.length > 0 ? (
          <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700">
            Caps: {m.scoreDebug.scoreCapsApplied.slice(0, 2).join(", ")}
          </span>
        ) : null}
      </div>

      {m.strengths?.length > 0 && (
        <ul className="text-sm text-green-800 space-y-1 mb-3">
          {m.strengths.map((s, i) => (
            <li key={i}>✓ {s}</li>
          ))}
        </ul>
      )}
      {m.gaps?.length > 0 && (
        <ul className="text-sm text-amber-800 space-y-1 mb-4">
          {m.gaps.map((s, i) => (
            <li key={i}>△ {s}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
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
        <Link
          href={`/candidate/${m.candidateId}`}
          className="ml-auto inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-navy-800 text-white text-sm font-medium hover:bg-navy-700"
        >
          View profile
        </Link>
        <Link
          href={`/candidate/${m.candidateId}`}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 text-navy-800 text-sm font-medium hover:bg-slate-50"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Link>
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
