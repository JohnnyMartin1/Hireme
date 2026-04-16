"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { getCandidateUrl, getDashboardUrl, getJobMatchesUrl, getJobOverviewUrl, getMessagesUrl } from "@/lib/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { PIPELINE_STAGES, normalizePipelineStage, type PipelineStage } from "@/lib/firebase-firestore";
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
  const jobId = params.id as string;
  const { user, profile } = useFirebaseAuth();

  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [cards, setCards] = useState<PipelineCandidateCard[]>([]);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);

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

      const [jobRes, pipelineRes, matchesRes] = await Promise.all([
        fetch(`/api/job/${jobId}`, { headers: auth }),
        fetch(`/api/job/${jobId}/pipeline`, { headers: auth }),
        fetch(`/api/job/${jobId}/matches`, { headers: auth }),
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

      setCards(mappedCards);
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
      REJECTED: [],
    };
    for (const c of cards) {
      out[normalizePipelineStage(c.stage)].push({ ...c, stage: normalizePipelineStage(c.stage) });
    }
    return out;
  }, [cards]);

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

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline board</p>
            <p className="text-sm font-semibold text-navy-900">{jobTitle || "Job pipeline"}</p>
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
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Loading pipeline...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PIPELINE_STAGES.map((stage) => (
              <section key={stage} className="bg-white rounded-xl border border-slate-200 p-4 min-h-[280px]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-navy-900">{stage}</h2>
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
                        <div className="flex items-start justify-between gap-2">
                          <Link href={getCandidateUrl(card.candidateId, jobId)} className="font-medium text-navy-900 hover:underline">
                            {card.name}
                          </Link>
                          <span className="text-xs font-semibold text-slate-700">
                            {card.score == null ? "—" : `${Math.round(card.score)}%`}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">
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
