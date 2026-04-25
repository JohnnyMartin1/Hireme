"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, ClipboardList, Users } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { fetchReviewAssignments } from "@/lib/collaboration-client";
import { getCompanyJobs, getDocument, getEmployerJobs } from "@/lib/firebase-firestore";
import ReviewAssignmentStatusBadge from "@/components/recruiter/ReviewAssignmentStatusBadge";

type QueueRow = any;

export default function EmployerReviewsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
  const [candidateNameById, setCandidateNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!user || !profile || (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER")) return;
      setLoadingRows(true);
      try {
        const jobsRes =
          profile.role === "RECRUITER" && profile.companyId
            ? await getCompanyJobs(profile.companyId, user.uid, !!profile.isCompanyOwner)
            : await getEmployerJobs(user.uid);
        const jobs = (jobsRes.data || []) as any[];
        const token = await user.getIdToken();
        const assignmentRows = (
          await Promise.all(
            jobs.map(async (job) => {
              const res = await fetchReviewAssignments(String(job.id), token);
              return res.ok
                ? (res.data.assignments || []).map((a) => ({ ...a, jobTitle: String(job.title || "Job") }))
                : [];
            })
          )
        ).flat();
        setRows(assignmentRows);
      } finally {
        setLoadingRows(false);
      }
    };
    load();
  }, [user, profile]);

  useEffect(() => {
    const hydrate = async () => {
      const userIds = Array.from(new Set(rows.flatMap((r) => [String(r.assignedToUserId || ""), String(r.requestedByUserId || "")]).filter(Boolean)));
      const candidateIds = Array.from(new Set(rows.map((r) => String(r.candidateId || "")).filter(Boolean)));
      const [userPairs, candidatePairs] = await Promise.all([
        Promise.all(
          userIds.map(async (id) => {
            const { data } = await getDocument("users", id);
            return [id, data ? `${(data as any).firstName || ""} ${(data as any).lastName || ""}`.trim() || String((data as any).email || "Teammate") : "Teammate"] as const;
          })
        ),
        Promise.all(
          candidateIds.map(async (id) => {
            const { data } = await getDocument("users", id);
            return [id, data ? `${(data as any).firstName || ""} ${(data as any).lastName || ""}`.trim() || "Candidate" : "Candidate"] as const;
          })
        ),
      ]);
      setNameByUserId(Object.fromEntries(userPairs));
      setCandidateNameById(Object.fromEntries(candidatePairs));
    };
    if (rows.length > 0) hydrate();
  }, [rows]);

  const assignedToMe = useMemo(() => rows.filter((r) => String(r.assignedToUserId || "") === String(user?.uid || "")), [rows, user?.uid]);
  const requestedByMe = useMemo(() => rows.filter((r) => String(r.requestedByUserId || "") === String(user?.uid || "")), [rows, user?.uid]);
  const completedRecently = useMemo(() => rows.filter((r) => String(r.status || "") === "COMPLETED").slice(0, 20), [rows]);

  if (loading || !user || !profile) return <main className="min-h-screen bg-slate-50 p-6 text-slate-600">Loading review queue...</main>;

  const Row = ({ row }: { row: QueueRow }) => (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">{candidateNameById[row.candidateId] || "Candidate"}</p>
          <p className="text-xs text-slate-600">{row.jobTitle}</p>
        </div>
        <ReviewAssignmentStatusBadge status={row.status} />
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Requested by {nameByUserId[row.requestedByUserId] || "Teammate"} · Assigned to {nameByUserId[row.assignedToUserId] || "Teammate"}
      </p>
      {row.message ? (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{row.message}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link href={`/candidate/${row.candidateId}?jobId=${encodeURIComponent(row.jobId)}`} className="rounded-md bg-navy-800 px-2 py-1 text-[11px] font-semibold text-white">
          Review candidate
        </Link>
        <Link href={`/employer/job/${row.jobId}`} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
          View job
        </Link>
        <Link href={`/employer/job/${row.jobId}/pipeline`} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
          View pipeline
        </Link>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom pt-14 sm:pt-16 md:pt-20">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Team collaboration</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Review queue</h1>
              <p className="text-sm text-slate-600 mt-1">Track reviews assigned to you, requested by you, and completed feedback.</p>
            </div>
            <Link href="/home/employer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Back to dashboard
            </Link>
          </div>
        </div>
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold uppercase tracking-wide">
              <ClipboardList className="h-4 w-4" />
              Assigned to me
            </div>
            <p className="mt-2 text-2xl font-bold text-navy-900">{assignedToMe.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold uppercase tracking-wide">
              <Clock3 className="h-4 w-4" />
              Requested by me
            </div>
            <p className="mt-2 text-2xl font-bold text-navy-900">{requestedByMe.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold uppercase tracking-wide">
              <CheckCircle2 className="h-4 w-4" />
              Completed recently
            </div>
            <p className="mt-2 text-2xl font-bold text-navy-900">{completedRecently.length}</p>
          </div>
        </div>
        {loadingRows ? <p className="text-sm text-slate-600 mb-4">Loading review queue...</p> : null}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900">Assigned to me ({assignedToMe.length})</h2>
            {assignedToMe.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500">No assigned reviews.</p>
                <p className="text-xs text-slate-400 mt-1">New requests from teammates will appear here.</p>
              </div>
            ) : assignedToMe.map((r) => <Row key={r.id} row={r} />)}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900">Requested by me ({requestedByMe.length})</h2>
            {requestedByMe.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500">No outgoing requests.</p>
                <p className="text-xs text-slate-400 mt-1">Use “Send for review” on candidate cards.</p>
              </div>
            ) : requestedByMe.map((r) => <Row key={r.id} row={r} />)}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
            <h2 className="text-sm font-bold text-navy-900">Completed recently ({completedRecently.length})</h2>
            {completedRecently.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500">No completed reviews yet.</p>
                <p className="text-xs text-slate-400 mt-1">Feedback summaries will show up here once submitted.</p>
              </div>
            ) : completedRecently.map((r) => <Row key={r.id} row={r} />)}
          </section>
        </div>
        {rows.length === 0 && !loadingRows ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <Users className="mx-auto h-7 w-7 text-slate-400" />
            <h3 className="mt-2 text-sm font-bold text-navy-900">No team review activity yet</h3>
            <p className="text-xs text-slate-500 mt-1">Start from a candidate and send them to a teammate for review.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
