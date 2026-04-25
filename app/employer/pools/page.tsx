"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { createTalentPool, fetchTalentPools, type TalentPool } from "@/lib/talent-pools-client";
import { getEmployerPoolDetailUrl } from "@/lib/navigation";
import { useToast } from "@/components/NotificationSystem";

function formatUpdated(p: TalentPool): string {
  const raw = (p as any)?.updatedAt || (p as any)?.createdAt;
  const d = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function EmployerPoolsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const toast = useToast();
  const [pools, setPools] = useState<TalentPool[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (profile && profile.role !== "EMPLOYER" && profile.role !== "RECRUITER" && profile.role !== "ADMIN") {
      router.push("/home/seeker");
    }
  }, [profile, router]);

  const load = async () => {
    if (!user) return;
    setLoadingPools(true);
    try {
      const token = await user.getIdToken();
      const res = await fetchTalentPools(token);
      if (res.ok) setPools(res.data.pools || []);
      else toast.error("Pools", res.error || "Could not load pools");
    } finally {
      setLoadingPools(false);
    }
  };

  useEffect(() => {
    if (user && profile && (profile.role === "EMPLOYER" || profile.role === "RECRUITER" || profile.role === "ADMIN")) {
      void load();
    }
  }, [user, profile]);

  const handleCreate = async () => {
    if (!user) return;
    const n = name.trim();
    if (!n) {
      toast.error("Pools", "Enter a pool name.");
      return;
    }
    setCreating(true);
    try {
      const token = await user.getIdToken();
      const res = await createTalentPool(token, { name: n, description: desc.trim() || undefined });
      if (!res.ok) {
        toast.error("Pools", res.error || "Could not create");
        return;
      }
      toast.success("Pools", "Pool created.");
      setName("");
      setDesc("");
      router.push(getEmployerPoolDetailUrl(res.data.pool.id));
    } finally {
      setCreating(false);
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
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-5xl mx-auto px-4 pt-10 sm:pt-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Talent pools</h1>
            <p className="text-slate-600 text-sm mt-1">Long-term Talent CRM — reusable groups across jobs. Different from shortlist (serious contenders for one job) and pipeline (everyone active on that job).</p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-8">
          <h2 className="text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New pool
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g. Campus — strong eng"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Who belongs here?"
              />
            </div>
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreate()}
              className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </section>

        {loadingPools ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-navy-800" />
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-600 text-sm">
            No pools yet. Create one above, or add candidates from matches, pipeline, search, or a profile.
          </div>
        ) : (
          <ul className="space-y-3">
            {pools.map((p) => (
              <li key={p.id}>
                <Link
                  href={getEmployerPoolDetailUrl(p.id)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-200 hover:shadow transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-sky-100 p-2">
                      <Users className="h-5 w-5 text-navy-800" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy-900">{p.name}</p>
                      {p.description ? <p className="text-xs text-slate-600 line-clamp-2">{String(p.description)}</p> : null}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 sm:text-right">
                    <span className="font-medium text-navy-800">{p.memberCount ?? 0}</span> candidates
                    <span className="mx-2 text-slate-300">·</span>
                    Updated {formatUpdated(p)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
