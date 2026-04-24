"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import {
  getJobCompareUrl,
  getJobMatchesUrl,
  getJobOverviewUrl,
  getJobPipelineUrl,
  getMessagesUrl,
} from "@/lib/navigation";

function tabClass(active: boolean): string {
  return `inline-flex items-center justify-center px-3 py-2 sm:px-4 rounded-lg text-sm font-semibold transition-colors min-h-[40px] ${
    active
      ? "bg-navy-800 text-white shadow-sm ring-1 ring-navy-900/10"
      : "text-navy-800 bg-white hover:bg-sky-50 border border-slate-200"
  }`;
}

export default function JobWorkspaceNav() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const jobId = params.id as string | undefined;
  const { user } = useFirebaseAuth();
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    if (!jobId || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/job/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && json?.job?.title) {
          setTitle(String(json.job.title));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, user]);

  if (!jobId) return null;

  const overview = getJobOverviewUrl(jobId);
  const matches = getJobMatchesUrl(jobId);
  const pipeline = getJobPipelineUrl(jobId);
  const compare = getJobCompareUrl(jobId);
  const messages = getMessagesUrl(jobId);

  const onOverview = pathname === overview;
  const onMatches = pathname === matches;
  const onPipeline = pathname === pipeline;
  const onCompare = pathname === compare;
  const messagesJobId = searchParams.get("jobId");
  const onMessages = pathname === "/messages" && messagesJobId === jobId;

  return (
    <div className="border-b border-slate-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job workspace</p>
            <h1 className="text-lg sm:text-xl font-bold text-navy-900 truncate">{title || "Loading job…"}</h1>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              Work this requisition: shortlist serious contenders, pipeline tracks everyone active, messages stay in context.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-1.5 sm:gap-2 sm:justify-end rounded-xl bg-slate-100 p-1.5 border border-slate-200"
            aria-label="Job workspace"
          >
            <Link href={overview} className={tabClass(onOverview)}>
              Overview
            </Link>
            <Link href={matches} className={tabClass(onMatches)}>
              Matches
            </Link>
            <Link href={pipeline} className={tabClass(onPipeline)}>
              Pipeline
            </Link>
            <Link href={compare} className={tabClass(onCompare)}>
              Compare
            </Link>
            <Link href={messages} className={tabClass(onMessages)}>
              Messages
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
