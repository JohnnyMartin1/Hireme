"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building, Search, Users, MessageSquare, Star, FileText, Lock } from "lucide-react";
import EmployerJobsList from "@/components/EmployerJobsList";
import {
  getEmployerPoolsUrl,
  getEmployerTemplatesUrl,
  getEmployerFeedbackUrl,
} from "@/lib/navigation";
import {
  getEmployerJobs,
  getCompanyJobs,
} from '@/lib/firebase-firestore';
import { fetchReviewAssignments } from "@/lib/collaboration-client";
import CompanyRatingDisplay from '@/components/CompanyRatingDisplay';
import UpcomingInterviewsPanel from "@/components/recruiter/UpcomingInterviewsPanel";
import {
  buildRecruiterWorkQueue,
  selectDashboardTasks,
  workQueueCategoryLabel,
  type WorkQueueTask,
} from "@/lib/recruiter-work-queue";

export default function EmployerHomePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [attentionLoading, setAttentionLoading] = useState(true);
  const activeDevTimersRef = useRef<Set<string>>(new Set());
  const [workQueueItems, setWorkQueueItems] = useState<WorkQueueTask[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [workQueueCounts, setWorkQueueCounts] = useState({
    total: 0,
    urgent: 0,
    interviews: 0,
    offers: 0,
    messages: 0,
    reviews: 0,
    followups: 0,
    sourcing: 0,
    other: 0,
    followUpDueToday: 0,
    followUpDue: 0,
    awaitingResponse: 0,
    awaitingRecruiterReply: 0,
    newMatches: 0,
    awaitingReview: 0,
    evaluationIncomplete: 0,
    finalistsPending: 0,
    interviewsSoon: 0,
    activeSequences: 0,
    sequenceStepsDue: 0,
    interviewNeedsEval: 0,
    offersPendingApproval: 0,
    offersReadyToSend: 0,
    offersAwaitingResponse: 0,
    offersAcceptedNeedClose: 0,
    scorecardsDue: 0,
    debriefsBlocked: 0,
    debriefsReady: 0,
    interviewsNeedingFollowUp: 0,
  });
  const [teamReviewCounts, setTeamReviewCounts] = useState({
    assignedToMe: 0,
    requestedByMePending: 0,
    feedbackReceived: 0,
    mentions: 0,
  });
  useEffect(() => {
    const loadTeamReviews = async () => {
      if (!user || !profile || (profile.role !== "EMPLOYER" && profile.role !== "RECRUITER")) return;
      const { data: jobs } = profile.companyId
        ? await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false)
        : await getEmployerJobs(user.uid);
      const token = await user.getIdToken();
      const assignments = (
        await Promise.all(
          ((jobs || []) as any[]).map(async (job) => {
            const res = await fetchReviewAssignments(String(job.id), token);
            return res.ok ? res.data.assignments || [] : [];
          })
        )
      ).flat();
      setTeamReviewCounts({
        assignedToMe: assignments.filter((a: any) => String(a.assignedToUserId || "") === user.uid && String(a.status || "") !== "COMPLETED").length,
        requestedByMePending: assignments.filter((a: any) => String(a.requestedByUserId || "") === user.uid && String(a.status || "") === "REQUESTED").length,
        feedbackReceived: assignments.filter((a: any) => String(a.requestedByUserId || "") === user.uid && String(a.status || "") === "COMPLETED").length,
        mentions: 0,
      });
    };
    loadTeamReviews();
  }, [user, profile]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Only redirect when Firestore explicitly says not verified (avoid loop when profile is fallback).
    if (profile && profile.emailVerified === false) {
      router.push("/auth/verify-email");
      return;
    }

    // Check if user has the correct role (EMPLOYER or RECRUITER)
    if (profile && profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
      if (profile.role === 'JOB_SEEKER') {
        router.push("/home/seeker");
      } else {
        router.push("/admin");
      }
      return;
    }

    // Check if company is verified (for employers only)
    if (profile && profile.role === 'EMPLOYER' && profile.status === 'pending_verification') {
      // Show pending verification message but allow access to dashboard
      // The dashboard will show a verification banner
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const startDevTimer = (label: string) => {
      if (process.env.NODE_ENV !== "development") return;
      const active = activeDevTimersRef.current;
      if (!active.has(label)) {
        console.time(label);
        active.add(label);
      }
    };

    const endDevTimer = (label: string) => {
      if (process.env.NODE_ENV !== "development") return;
      const active = activeDevTimersRef.current;
      if (active.has(label)) {
        console.timeEnd(label);
        active.delete(label);
      }
    };

    const loadNeedsAttention = async () => {
      if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) return;

      setAttentionLoading(true);
      try {
        startDevTimer("dashboard:load-needs-attention");
        const result = await buildRecruiterWorkQueue({
          user: { uid: user.uid, getIdToken: () => user.getIdToken() },
          profile: {
            role: profile.role,
            companyId: profile.companyId || undefined,
            isCompanyOwner: profile.isCompanyOwner || false,
          },
        });
        setWorkQueueItems(selectDashboardTasks(result.tasks, 5));
        setUpcomingInterviews(result.upcomingInterviews);
        setWorkQueueCounts(result.counts);
      } finally {
        endDevTimer("dashboard:load-needs-attention");
        setAttentionLoading(false);
      }
    };

    loadNeedsAttention();
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
        {/* FIX2: flat page bg (no inline gradient) */}
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  // Double-check role before rendering
  if (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
    return null; // Will redirect to appropriate dashboard
  }

  const companyName = profile?.companyName || profile?.isCompanyOwner 
    ? (profile?.companyName || 'Your Company') 
    : (profile?.firstName || 'Employer');
  
  const companyInitial = companyName.charAt(0).toUpperCase();
  const isVerified = profile?.status === 'verified' || profile?.role === 'RECRUITER';

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full bg-slate-50">
      <div className="w-full md:max-w-7xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 pb-4 sm:pb-6 md:pb-10 min-w-0">
        
        {/* Welcome Banner */}
        {/* FIX2: solid navy banner (no gradient) — matches job workspace surfaces */}
        <section className="w-full min-w-0 bg-navy-800 text-white p-4 sm:p-5 md:p-6 lg:p-8 rounded-none sm:rounded-xl md:rounded-2xl flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-6 md:mb-8 shadow-lg">
          <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6 w-full sm:w-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-sky-400/20 flex items-center justify-center border-4 border-white/30 shadow-lg flex-shrink-0">
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{companyInitial}</span>
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold break-words">Welcome back, {companyName}</h1>
              <p className="text-sky-200 mt-1 text-xs sm:text-sm md:text-base">Ready to find your next talented candidate?</p>
            </div>
          </div>
        </section>
        
        {/* Verification Banner */}
        {profile?.status === 'pending_verification' && (
          <section className="w-full min-w-0 border-x-0 sm:border border-amber-200 bg-amber-50 p-4 sm:p-6 rounded-none sm:rounded-xl md:rounded-2xl flex items-start gap-3 sm:gap-4 mb-3 sm:mb-6 md:mb-8 text-amber-950">
            <div className="mt-0.5 shrink-0 rounded-full border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-amber-800">
              !
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-navy-900">Company verification pending</h2>
              <p className="text-sm text-slate-700">
                Your company registration is under review. You will receive an email notification once approved. Some features may be limited until verification is complete.{" "}
                <button
                  type="button"
                  title="Typical review timelines are shared by email when you registered."
                  className="font-semibold text-sky-800 underline decoration-sky-600/40 hover:text-navy-900"
                >
                  Learn more
                </button>
              </p>
            </div>
          </section>
        )}
        
        {/* Your Work Today */}
        <section className="w-full min-w-0 bg-white p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-md border-x-0 sm:border border-slate-200 mb-3 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-navy-900">Your work today</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                What needs your attention right now. Each row opens the best place to act.
              </p>
            </div>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              {attentionLoading ? 'Loading...' : `${workQueueCounts.total} items ready`}
            </span>
          </div>

          {attentionLoading ? (
            <p className="text-sm text-slate-500">Loading recruiter actions...</p>
          ) : (
            <>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                <span className="font-semibold text-navy-900">Signals:</span>{" "}
                {workQueueCounts.followUpDue > 0 && (
                  <span>Overdue follow-ups {workQueueCounts.followUpDue}. </span>
                )}
                {workQueueCounts.awaitingRecruiterReply > 0 && (
                  <span>Candidate replies waiting on you {workQueueCounts.awaitingRecruiterReply}. </span>
                )}
                {workQueueCounts.awaitingResponse > 0 && (
                  <span>Awaiting candidate {workQueueCounts.awaitingResponse}. </span>
                )}
                {workQueueCounts.newMatches > 0 && (
                  <span>New strong matches {workQueueCounts.newMatches}. </span>
                )}
                {workQueueCounts.awaitingReview > 0 && (
                  <span>Reviews requested {workQueueCounts.awaitingReview}. </span>
                )}
                {workQueueCounts.interviewNeedsEval > 0 && (
                  <span>Interviews need evaluation {workQueueCounts.interviewNeedsEval}. </span>
                )}
                {workQueueCounts.offersPendingApproval > 0 && (
                  <span>Offers pending approval {workQueueCounts.offersPendingApproval}. </span>
                )}
                {workQueueCounts.offersReadyToSend > 0 && (
                  <span>Offers ready to send {workQueueCounts.offersReadyToSend}. </span>
                )}
                {workQueueCounts.offersAwaitingResponse > 0 && (
                  <span>Offers awaiting candidate {workQueueCounts.offersAwaitingResponse}. </span>
                )}
                {workQueueCounts.offersAcceptedNeedClose > 0 && (
                  <span>Accepted offers — confirm job close {workQueueCounts.offersAcceptedNeedClose}. </span>
                )}
                {workQueueCounts.followUpDue === 0 &&
                  workQueueCounts.awaitingRecruiterReply === 0 &&
                  workQueueCounts.awaitingResponse === 0 &&
                  workQueueCounts.newMatches === 0 &&
                  workQueueCounts.awaitingReview === 0 &&
                  workQueueCounts.interviewNeedsEval === 0 &&
                  workQueueCounts.offersPendingApproval === 0 &&
                  workQueueCounts.offersReadyToSend === 0 &&
                  workQueueCounts.offersAwaitingResponse === 0 &&
                  workQueueCounts.offersAcceptedNeedClose === 0 && (
                  <span>Nothing urgent in these categories.</span>
                )}
              </p>
              {workQueueItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-navy-900">Nothing in your work queue</p>
                  <p className="text-xs text-slate-500 mt-1">No urgent follow-ups, reviews, interviews, offers, or messages right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workQueueCounts.total > workQueueItems.length ? (
                    <p className="text-xs text-slate-500">
                      Showing {workQueueItems.length} of {workQueueCounts.total} highest-priority tasks.
                    </p>
                  ) : null}
                  {workQueueItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-colors hover:bg-white"
                    >
                      <Link href={item.href} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{item.title}</p>
                          <p className="text-xs opacity-80">{item.subtitle}</p>
                          <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {workQueueCategoryLabel(item.category)}
                          </span>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white">
                          {item.actionLabel}
                        </span>
                      </Link>
                    </div>
                  ))}
                  <div className="pt-1">
                    <Link href="/employer/work-queue" className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-100">
                      View all tasks
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        <section className="w-full min-w-0 bg-white p-4 sm:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-md border-x-0 sm:border border-slate-200 mb-3 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-navy-900">Interview follow-up</h3>
              <p className="text-xs text-slate-600">
                Complete scorecards, track missing feedback, and finalize debrief decisions.
              </p>
              {workQueueCounts.interviewsNeedingFollowUp > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">Scorecards due {workQueueCounts.scorecardsDue}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">Evaluations incomplete {workQueueCounts.interviewNeedsEval}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">Debriefs blocked {workQueueCounts.debriefsBlocked}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">Debriefs ready {workQueueCounts.debriefsReady}</span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No interview follow-up pending.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/employer/work-queue?category=interviews" className="rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white">
                Open interview tasks
              </Link>
              <Link href={getEmployerFeedbackUrl()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-navy-900">
                Open feedback queue
              </Link>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 lg:grid-cols-3 gap-0 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8 w-full max-w-full min-w-0">
          {/* Left Column - Main Content */}
          <div className="col-span-12 lg:col-span-2 space-y-0 sm:space-y-3 md:space-y-4 lg:space-y-6 xl:space-y-8 w-full max-w-full min-w-0 px-0">
            {/* Manage Jobs Card */}
            <UpcomingInterviewsPanel interviews={upcomingInterviews} />
            {/* Manage Jobs Card */}
            <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 card-hover mb-3 sm:mb-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-navy-900">Requisitions needing attention</h2>
                  <p className="text-xs text-slate-500 mt-1">Pick a role to work — candidates, pipeline, compare, and inbox live in the job workspace.</p>
                </div>
                <Link
                  href="/employer/job/new"
                  className="bg-navy-800 text-white font-semibold py-2.5 sm:py-2.5 px-4 sm:px-5 rounded-lg hover:bg-navy-700 transition-colors duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[44px] w-full sm:w-auto"
                >
                  <Building className="h-4 w-4" />
                  <span>Post New Job</span>
                </Link>
              </div>
              <EmployerJobsList limit={3} mode="dashboard" />
            </div>

            {/* Company Ratings Card */}
            <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 card-hover mb-3 sm:mb-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-navy-900 mb-4 sm:mb-6">Company Ratings</h2>
              <CompanyRatingDisplay employerId={user.uid} showDetails={true} />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="col-span-12 lg:col-span-1 w-full max-w-full px-0">
            {/* Quick Actions Card */}
            <div className="w-full bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 card-hover mb-3 sm:mb-0 lg:sticky lg:top-28">
              <h2 className="text-lg sm:text-xl font-bold text-navy-900 mb-4 sm:mb-5 px-2">Quick Actions</h2>
              <div className="space-y-2">
                {/* Search Candidates */}
                {isVerified ? (
                  <Link
                    href="/search/candidates"
                    className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Search className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                    </div>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">Search Candidates</span>
                    <div className="ml-auto">
                      <div className="text-slate-400">›</div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center p-3 sm:p-4 rounded-lg cursor-not-allowed opacity-50 min-h-[56px]" title="Available after company verification">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="font-semibold text-slate-500 text-sm sm:text-base">Search Candidates</span>
                      <span className="text-xs text-slate-400 block">Available after verification</span>
                    </div>
                    <div className="ml-auto text-slate-400" aria-hidden>
                      <Lock className="h-4 w-4" />
                    </div>
                  </div>
                )}

                {/* Open Messages */}
                <Link
                  href="/messages"
                  className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                  </div>
                  <span className="font-semibold text-slate-700 text-sm sm:text-base">Open Messages</span>
                  <div className="ml-auto">
                    <div className="text-slate-400">›</div>
                  </div>
                </Link>

                <Link
                  href="/employer/work-queue"
                  className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">Work queue</span>
                    <p className="text-[11px] text-slate-500">{workQueueCounts.total} total tasks</p>
                  </div>
                  <div className="ml-auto">
                    <div className="text-slate-400">›</div>
                  </div>
                </Link>

                <Link
                  href="/employer/reviews"
                  className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">Open review queue</span>
                    <p className="text-[11px] text-slate-500">
                      {teamReviewCounts.assignedToMe} assigned · {teamReviewCounts.requestedByMePending} pending requests
                    </p>
                  </div>
                  <div className="ml-auto">
                    <div className="text-slate-400">›</div>
                  </div>
                </Link>

                <Link
                  href={getEmployerPoolsUrl()}
                  className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                  </div>
                  <span className="font-semibold text-slate-700 text-sm sm:text-base">Talent pools</span>
                  <div className="ml-auto">
                    <div className="text-slate-400">›</div>
                  </div>
                </Link>

                <Link
                  href={getEmployerTemplatesUrl()}
                  className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                  </div>
                  <span className="font-semibold text-slate-700 text-sm sm:text-base">Message templates</span>
                  <div className="ml-auto">
                    <div className="text-slate-400">›</div>
                  </div>
                </Link>

                {/* Post New Job */}
                <Link
                  href="/employer/job/new"
                  className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                  </div>
                  <span className="font-semibold text-slate-700 text-sm sm:text-base">Post New Job</span>
                  <div className="ml-auto">
                    <div className="text-slate-400">›</div>
                  </div>
                </Link>

                {/* Get Verified - only show if pending */}
                {profile?.status === 'pending_verification' && (
                  <Link
                    href="/account/company"
                    className="flex items-center p-3 sm:p-4 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 active:bg-amber-100 min-h-[56px] transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-amber-200 bg-amber-100 flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-800" />
                    </div>
                    <span className="font-semibold text-amber-950 text-sm sm:text-base">Get verified</span>
                    <div className="ml-auto">
                      <div className="text-amber-800">›</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            <div className="w-full bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 card-hover mb-3 sm:mb-0">
              <h2 className="text-lg sm:text-xl font-bold text-navy-900 mb-2 px-2">Team review</h2>
              <div className="px-2 text-xs text-slate-600 space-y-1">
                <p>{teamReviewCounts.assignedToMe} reviews assigned to me</p>
                <p>{teamReviewCounts.requestedByMePending} pending reviews I requested</p>
                <p>{teamReviewCounts.feedbackReceived} feedback received</p>
                <p>{teamReviewCounts.mentions} new mentions</p>
              </div>
              <Link href="/employer/reviews" className="mt-3 inline-flex rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white">
                Open review queue
              </Link>
            </div>

            {/* Company Profile Card */}
            <div className="w-full bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 card-hover">
              <h2 className="text-lg sm:text-xl font-bold text-navy-900 mb-4 sm:mb-5 px-2">Company Profile</h2>
              <div className="space-y-4">
                <div className="px-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Company Name</label>
                  <p className="font-semibold text-slate-800 flex items-center mt-1 text-sm sm:text-base">
                    {companyName}
                    {profile?.status === 'pending_verification' && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Pending</span>
                    )}
                  </p>
                </div>
                
                {/* Edit Company Profile */}
                {profile?.isCompanyOwner ? (
                  <Link
                    href="/account/company"
                    className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                    </div>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">Edit Company Profile</span>
                    <div className="ml-auto">
                      <div className="text-slate-400">›</div>
                    </div>
                  </Link>
                ) : (
                  <Link
                    href="/company/view"
                    className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                    </div>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">View Company Profile</span>
                    <div className="ml-auto">
                      <div className="text-slate-400">›</div>
                    </div>
                  </Link>
                )}

                {/* Manage Recruiters */}
                {profile?.isCompanyOwner && (
                  <Link
                    href="/company/manage/recruiters"
                    className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-sky-50 min-h-[56px] active:bg-sky-100 transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-navy-800" />
                    </div>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">Manage Recruiters</span>
                    <div className="ml-auto">
                      <div className="text-slate-400">›</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}