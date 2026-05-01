"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ExternalLink, MessageSquare, Trash2, Filter, Briefcase, ChevronRight } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useToast } from "@/components/NotificationSystem";
import {
  fetchTalentPool,
  removeTalentPoolMember,
  updateTalentPoolMember,
  type TalentPoolMember,
} from "@/lib/talent-pools-client";
import {
  getCandidateUrl,
  getCandidatesSearchUrl,
  getEmployerPoolsUrl,
  getJobPipelineUrl,
} from "@/lib/navigation";
import { getDocument, getEmployerJobs, getCompanyJobs } from "@/lib/firebase-firestore";
import { postJobPipeline } from "@/lib/pipeline-client";
type MemberRow = TalentPoolMember & { displayName?: string };

export default function EmployerPoolDetailPage() {
  const params = useParams();
  const poolId = params.poolId as string;
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const toast = useToast();
  const [poolName, setPoolName] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [pipelineOpenFor, setPipelineOpenFor] = useState<string | null>(null);
  const [pipelineJobId, setPipelineJobId] = useState("");
  const [pipelineStage, setPipelineStage] = useState<"NEW" | "SHORTLIST">("SHORTLIST");
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [pipelineAddedJobId, setPipelineAddedJobId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !poolId) return;
    setLoadingData(true);
    try {
      const token = await user.getIdToken();
      const res = await fetchTalentPool(poolId, token);
      if (!res.ok) {
        toast.error("Pools", res.error || "Could not load pool");
        setMembers([]);
        return;
      }
      const p = res.data.pool as { name?: string };
      setPoolName(String(p?.name || "Pool"));
      const raw = (res.data.members || []) as TalentPoolMember[];
      const withNames: MemberRow[] = await Promise.all(
        raw.map(async (m) => {
          const { data } = await getDocument("users", m.candidateId);
          const u = (data || {}) as Record<string, unknown>;
          const displayName =
            `${String(u.firstName || "").trim()} ${String(u.lastName || "").trim()}`.trim() || "Candidate";
          return { ...m, displayName };
        })
      );
      withNames.sort((a, b) => {
        const ad = (a as any).addedAt?.toDate ? (a as any).addedAt.toDate().getTime() : 0;
        const bd = (b as any).addedAt?.toDate ? (b as any).addedAt.toDate().getTime() : 0;
        return bd - ad;
      });
      setMembers(withNames);
    } finally {
      setLoadingData(false);
    }
  }, [user, poolId]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && profile && (profile.role === "EMPLOYER" || profile.role === "RECRUITER" || profile.role === "ADMIN")) {
      void load();
    }
  }, [user, profile, load]);

  useEffect(() => {
    const loadJobs = async () => {
      if (!user || !profile) return;
      try {
        const { data, error } =
          profile.role === "RECRUITER" && profile.companyId
            ? await getCompanyJobs(profile.companyId, user.uid, Boolean(profile.isCompanyOwner))
            : await getEmployerJobs(user.uid);
        if (error || !data) {
          setJobs([]);
          return;
        }
        setJobs((data as any[]).map((j) => ({ id: j.id, title: j.title || "Job" })));
      } catch {
        setJobs([]);
      }
    };
    void loadJobs();
  }, [user, profile]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const m of members) {
      if (Array.isArray(m.tags)) for (const t of m.tags) s.add(String(t).toLowerCase());
    }
    return [...s].sort();
  }, [members]);

  const visibleMembers = useMemo(() => {
    if (!tagFilter) return members;
    const t = tagFilter.toLowerCase();
    return members.filter((m) => Array.isArray(m.tags) && m.tags.some((x) => String(x).toLowerCase() === t));
  }, [members, tagFilter]);

  const addToJobPipeline = async (candidateId: string) => {
    if (!user || !pipelineJobId) {
      toast.error("Pipeline", "Choose a job.");
      return;
    }
    setPipelineBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await postJobPipeline(pipelineJobId, { candidateId, stage: pipelineStage }, token);
      if (!res.ok) {
        toast.error("Pipeline", res.error || "Could not add to pipeline");
        return;
      }
      toast.success("Pipeline", `Added to job as ${pipelineStage}.`);
      setPipelineOpenFor(null);
      const addedJobId = pipelineJobId;
      setPipelineJobId("");
      setPipelineAddedJobId(addedJobId);
    } finally {
      setPipelineBusy(false);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-navy-800" />
      </div>
    );
  }

  if (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER" && profile.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 pt-10 sm:pt-14">
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-600" aria-label="Breadcrumb">
          <Link href={getEmployerPoolsUrl()} className="font-medium text-sky-800 hover:underline">
            Talent pools
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="font-semibold text-navy-900 truncate max-w-[min(100%,28rem)]">{poolName}</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">{poolName}</h1>
            <p className="text-slate-600 text-sm mt-1">
              {members.length} member{members.length !== 1 ? "s" : ""}
              {tagFilter ? ` · filtered by “${tagFilter}”` : ""}
            </p>
          </div>
        </div>

        {pipelineAddedJobId && (
          <div className="mb-6 flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-navy-900">
              Candidate added to that job&apos;s pipeline. Continue there to stage and message them.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={getJobPipelineUrl(pipelineAddedJobId)}
                className="inline-flex rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700"
              >
                Open job pipeline
              </Link>
              <button
                type="button"
                onClick={() => setPipelineAddedJobId(null)}
                className="text-xs font-semibold text-sky-900 underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <Filter className="h-4 w-4 text-slate-500" />
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                !tagFilter ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  tagFilter === t ? "bg-sky-700 text-white" : "bg-sky-50 text-sky-900 border border-sky-100 hover:bg-sky-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {loadingData ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
          </div>
        ) : visibleMembers.length === 0 ? (
          <p className="text-slate-600 text-sm">No members match this filter.</p>
        ) : (
          <ul className="space-y-4">
            {visibleMembers.map((m) => (
              <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-navy-900">{m.displayName || "Candidate"}</p>
                    {m.notes ? <p className="text-xs text-slate-600 mt-1 max-w-xl">{String(m.notes)}</p> : null}
                    {Array.isArray(m.tags) && m.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.tags.map((t) => (
                          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={getCandidateUrl(m.candidateId)}
                      className="inline-flex items-center gap-1 rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700"
                    >
                      Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href={`${getCandidateUrl(m.candidateId)}?action=message`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Messages
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setPipelineOpenFor(pipelineOpenFor === m.candidateId ? null : m.candidateId);
                        setPipelineJobId("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-sky-100"
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      Add to job
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) return;
                        const token = await user.getIdToken();
                        const res = await removeTalentPoolMember(poolId, m.id, token);
                        if (!res.ok) toast.error("Pools", res.error || "Remove failed");
                        else {
                          toast.success("Pools", "Removed from pool.");
                          void load();
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

                {pipelineOpenFor === m.candidateId && (
                  <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/80 p-3 space-y-2">
                    <p className="text-xs font-semibold text-navy-900">Add to job pipeline</p>
                    <select
                      value={pipelineJobId}
                      onChange={(e) => setPipelineJobId(e.target.value)}
                      className="w-full max-w-md rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      <option value="">Select job…</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-slate-600">Stage</label>
                      <select
                        value={pipelineStage}
                        onChange={(e) => setPipelineStage(e.target.value as "NEW" | "SHORTLIST")}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="SHORTLIST">SHORTLIST</option>
                        <option value="NEW">NEW</option>
                      </select>
                      <button
                        type="button"
                        disabled={pipelineBusy}
                        onClick={() => void addToJobPipeline(m.candidateId)}
                        className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
                      >
                        {pipelineBusy ? "Saving…" : "Confirm"}
                      </button>
                      <Link
                        href={getCandidatesSearchUrl(pipelineJobId || undefined)}
                        className="text-xs font-semibold text-sky-800 hover:underline"
                      >
                        Match in search
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <TagEditorInline poolId={poolId} member={m} onSaved={() => void load()} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function TagEditorInline({
  poolId,
  member,
  onSaved,
}: {
  poolId: string;
  member: MemberRow;
  onSaved: () => void;
}) {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [draft, setDraft] = useState(Array.isArray(member.tags) ? member.tags.join(", ") : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(Array.isArray(member.tags) ? member.tags.join(", ") : "");
  }, [member.id, member.tags]);

  const save = async () => {
    if (!user) return;
    const tags = draft
      .split(/[,]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20);
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await updateTalentPoolMember(poolId, member.id, token, { tags });
      if (!res.ok) toast.error("Pools", res.error || "Update failed");
      else {
        toast.success("Pools", "Tags saved.");
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-[11px] font-medium text-slate-500">Edit tags</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
        placeholder="Comma-separated"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
