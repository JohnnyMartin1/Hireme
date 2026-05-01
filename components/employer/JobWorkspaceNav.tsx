"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Columns3,
  GitCompare,
  Inbox,
  CalendarCheck2,
  FileText,
} from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import {
  getJobCompareUrl,
  getJobInterviewPlanUrl,
  getJobMatchesUrl,
  getJobOverviewUrl,
  getJobPipelineUrl,
  getJobOffersUrl,
  getMessagesUrl,
} from "@/lib/navigation";

function tabClass(active: boolean): string {
  return `inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-4 rounded-lg text-sm font-semibold transition-colors min-h-[40px] ${
    active
      ? "bg-navy-800 text-white ring-2 ring-navy-800 ring-offset-2 ring-offset-white"
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
  const interviews = getJobInterviewPlanUrl(jobId);
  const offers = getJobOffersUrl(jobId);
  const messages = getMessagesUrl(jobId);

  const onOverview = pathname === overview;
  const onMatches = pathname === matches;
  const onPipeline = pathname === pipeline;
  const onCompare = pathname === compare;
  const onInterviews = pathname === interviews;
  const onOffers = pathname === offers;
  const messagesJobId = searchParams.get("jobId");
  const onMessages = pathname === "/messages" && messagesJobId === jobId;

  return (
    /* FIX1: single sticky job context bar below fixed SiteHeader — aligns with search toolbar top-20 */
    /* FIX5: icons + labels on every tab; FIX4: mobile glossary line restored (abbreviated). */
    <div className="border-b border-slate-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job workspace</p>
            <h1 className="text-xl sm:text-2xl font-bold text-navy-900 truncate">{title || "Loading job…"}</h1>
            <p className="text-xs text-slate-500 mt-0.5 sm:hidden leading-snug">
              Shortlist = short list of finalists · Pipeline = all active candidates · Pools = saved groups (main nav).
            </p>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              Shortlist = serious contenders for this job. Pipeline = everyone you are actively working. Talent pools = saved groups across jobs (see Pools in the main nav).
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-1.5 sm:gap-2 sm:justify-end rounded-xl bg-slate-100 p-1.5 border border-slate-200"
            aria-label="Job workspace"
          >
            <Link href={overview} className={tabClass(onOverview)}>
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              Overview
            </Link>
            <Link href={matches} className={tabClass(onMatches)}>
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              Candidates
            </Link>
            <Link href={pipeline} className={tabClass(onPipeline)}>
              <Columns3 className="h-4 w-4 shrink-0" aria-hidden />
              Pipeline
            </Link>
            <Link href={compare} className={tabClass(onCompare)}>
              <GitCompare className="h-4 w-4 shrink-0" aria-hidden />
              Compare
            </Link>
            <Link href={interviews} className={tabClass(onInterviews)}>
              <CalendarCheck2 className="h-4 w-4 shrink-0" aria-hidden />
              Interviews
            </Link>
            <Link href={offers} className={tabClass(onOffers)}>
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              Offers
            </Link>
            <Link href={messages} className={tabClass(onMessages)}>
              <Inbox className="h-4 w-4 shrink-0" aria-hidden />
              Messages
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
