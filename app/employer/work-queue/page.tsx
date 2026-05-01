"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import {
  buildRecruiterWorkQueue,
  workQueueCategoryLabel,
  type WorkQueueCategory,
  type WorkQueueTask,
} from "@/lib/recruiter-work-queue";

const FILTERS: Array<{ key: "all" | WorkQueueCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "interviews", label: "Interviews" },
  { key: "offers", label: "Offers" },
  { key: "messages", label: "Messages" },
  { key: "reviews", label: "Reviews" },
  { key: "followups", label: "Follow-ups" },
  { key: "sourcing", label: "Sourcing" },
];

function EmployerWorkQueueContent() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<WorkQueueTask[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    urgent: 0,
    interviews: 0,
    offers: 0,
    messages: 0,
    reviews: 0,
    followups: 0,
    sourcing: 0,
    other: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!user || !profile || (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER")) return;
      setIsLoading(true);
      try {
        const result = await buildRecruiterWorkQueue({
          user: { uid: user.uid, getIdToken: () => user.getIdToken() },
          profile: {
            role: profile.role,
            companyId: profile.companyId || undefined,
            isCompanyOwner: profile.isCompanyOwner || false,
          },
        });
        setTasks(result.tasks);
        setCounts({
          total: result.counts.total,
          urgent: result.counts.urgent,
          interviews: result.counts.interviews,
          offers: result.counts.offers,
          messages: result.counts.messages,
          reviews: result.counts.reviews,
          followups: result.counts.followups,
          sourcing: result.counts.sourcing,
          other: result.counts.other,
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, profile]);

  const activeFilter = useMemo(() => {
    const raw = String(searchParams.get("category") || "").toLowerCase().trim();
    if (raw === "follow-ups") return "followups";
    if (FILTERS.some((f) => f.key === raw)) return raw as "all" | WorkQueueCategory;
    return "all";
  }, [searchParams]);

  const filteredTasks = useMemo(() => {
    if (activeFilter === "all") return tasks;
    return tasks.filter((task) => task.category === activeFilter);
  }, [tasks, activeFilter]);

  const filterHref = (key: "all" | WorkQueueCategory) => {
    if (key === "all") return "/employer/work-queue";
    return `/employer/work-queue?category=${encodeURIComponent(key)}`;
  };

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-6 pt-14 sm:px-6 sm:pb-6 sm:pt-16 md:px-8 md:pt-20">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h1 className="text-2xl font-bold text-navy-900">Work queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            All recruiter actions across jobs, candidates, interviews, offers, and messages.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Total {counts.total}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Urgent {counts.urgent}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Interviews {counts.interviews}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Offers {counts.offers}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Messages {counts.messages}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Reviews {counts.reviews}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <Link
                key={filter.key}
                href={filterHref(filter.key)}
                className={
                  activeFilter === filter.key
                    ? "rounded-full bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                }
              >
                {filter.label}
              </Link>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading work queue...</p>
          ) : filteredTasks.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No tasks in this category right now.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy-900">{task.title}</p>
                      <p className="text-xs text-slate-600">{task.subtitle}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {workQueueCategoryLabel(task.category)}
                        </span>
                        {task.dueAt ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Due {new Date(task.dueAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Link href={task.href} className="inline-flex shrink-0 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white">
                      {task.actionLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function EmployerWorkQueuePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 pb-6 pt-14 sm:px-6 sm:pb-6 sm:pt-16 md:px-8 md:pt-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm text-slate-500">Loading work queue...</p>
          </div>
        </main>
      }
    >
      <EmployerWorkQueueContent />
    </Suspense>
  );
}
