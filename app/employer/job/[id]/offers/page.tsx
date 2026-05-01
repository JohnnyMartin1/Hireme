"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { fetchJobOffers, offerStatusLabel } from "@/lib/offers/client";
import type { CandidateOfferRecord } from "@/lib/offers/types";
import { getCandidateUrl, getJobPipelineUrl } from "@/lib/navigation";
import { recruiterBadge } from "@/lib/recruiter-ui";
import { getDocument } from "@/lib/firebase-firestore";

export default function JobOffersPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { user, profile } = useFirebaseAuth();
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [offers, setOffers] = useState<CandidateOfferRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"UPDATED" | "STATUS">("UPDATED");

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
      const [jobRes, offersRes] = await Promise.all([
        fetch(`/api/job/${jobId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetchJobOffers(jobId, token),
      ]);
      const jobJson = await jobRes.json().catch(() => ({}));
      if (jobRes.ok && jobJson?.job?.title) {
        setJobTitle(String(jobJson.job.title));
      }
      if (offersRes.ok) {
        const list = [...(offersRes.data.offers || [])].sort((a, b) => {
          const ta = (a as any).updatedAt?.toMillis?.() ?? (a as any).createdAt?.toMillis?.() ?? 0;
          const tb = (b as any).updatedAt?.toMillis?.() ?? (b as any).createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setOffers(list as CandidateOfferRecord[]);
        setCounts(offersRes.data.counts || {});
        const nameMap: Record<string, string> = {};
        const seen = new Set<string>();
        for (const o of list) {
          const cid = String((o as any).candidateId || "");
          if (!cid || seen.has(cid)) continue;
          seen.add(cid);
          const { data: u } = await getDocument("users", cid);
          const row = (u || {}) as Record<string, unknown>;
          const nm = `${String(row.firstName || "").trim()} ${String(row.lastName || "").trim()}`.trim();
          nameMap[cid] = nm || "Candidate";
        }
        setNames(nameMap);
      } else {
        setOffers([]);
        setCounts({});
      }
    } finally {
      setLoading(false);
    }
  }, [jobId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || !profile) return null;

  const visibleOffers = offers
    .filter((o) => {
      const status = String((o as any).status || "").toUpperCase();
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      const cid = String((o as any).candidateId || "");
      const nm = String(names[cid] || "Candidate").toLowerCase();
      if (search.trim() && !nm.includes(search.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "STATUS") {
        return String((a as any).status || "").localeCompare(String((b as any).status || ""));
      }
      const ta = (a as any).updatedAt?.toMillis?.() ?? (a as any).createdAt?.toMillis?.() ?? 0;
      const tb = (b as any).updatedAt?.toMillis?.() ?? (b as any).createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offers</p>
        <h1 className="text-2xl font-bold text-navy-900 mt-1">{jobTitle || "Job"}</h1>
        <p className="text-sm text-slate-600 mt-1">
          All offers for this requisition. Manage details and status from each candidate&apos;s profile.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={getJobPipelineUrl(jobId)} className="font-semibold text-sky-800 hover:underline">
            Pipeline
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600 py-12 justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading offers…
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <p className="font-semibold text-navy-900">No offers yet</p>
          <p className="text-sm text-slate-600 mt-1">Offers will appear here once finalists move forward.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-2 md:grid-cols-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "UPDATED" | "STATUS")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="UPDATED">Sort: last updated</option>
              <option value="STATUS">Sort: status</option>
            </select>
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "ACCEPTED", "DECLINED", "WITHDRAWN"].map((k) => (
              <span key={k} className={`rounded-full px-2 py-1 font-semibold ${recruiterBadge.inactive}`}>
                {offerStatusLabel(k)}: {counts[k] ?? 0}
              </span>
            ))}
          </div>
          <ul className="space-y-2">
            {visibleOffers.map((o) => {
              const cid = String((o as any).candidateId || "");
              return (
                <li key={(o as any).id || cid} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy-900">{names[cid] || "Candidate"}</p>
                    <p className="text-xs text-slate-600">
                      {(o as any).title || "Offer"} · {(o as any).roleTitle || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold rounded-full px-2 py-1 ${recruiterBadge.pending}`}>
                      {offerStatusLabel(String((o as any).status))}
                    </span>
                    <Link
                      href={getCandidateUrl(cid, jobId)}
                      className="rounded-md bg-navy-800 px-2 py-1 text-xs font-semibold text-white hover:bg-navy-700"
                    >
                      View candidate
                    </Link>
                    <Link
                      href={`${getCandidateUrl(cid, jobId)}#recruiter-offer-panel`}
                      className="text-xs font-semibold text-navy-800 underline underline-offset-2 hover:text-navy-600"
                    >
                      Open offer panel
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
