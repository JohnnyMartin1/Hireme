"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useMemo } from "react";
import { User, MessageSquare, ArrowRight, Loader2, Filter, Briefcase, X } from "lucide-react";
import {
  getUserMessageThreads,
  getDocument,
  getParticipantProfileForMessaging,
  getEmployerJobs,
  getCompanyJobs,
  getPipelineEntryForJobCandidate,
  normalizePipelineStage,
  threadDataToJobDetails,
} from '@/lib/firebase-firestore';
import { getCommunicationStatusDisplayLabels, getRecruiterNextStep } from "@/lib/communication-status";
import Link from 'next/link';
import { getCandidatesSearchUrl, getEmployerTemplatesUrl, getJobOverviewUrl } from "@/lib/navigation";
import { pipelineStageLabel } from "@/lib/recruiter-ui";

interface MessageThread {
  id: string;
  participantIds: string[];
  createdAt: any;
  updatedAt: any;
  lastMessageAt: any;
  jobId?: string;
  jobContext?: Record<string, unknown>;
}

interface ThreadWithParticipants {
  thread: MessageThread;
  otherParticipant: any;
  lastMessage?: any;
  jobId?: string;
  jobTitle?: string;
  pipelineStage?: string;
  nextFollowUpAt?: any;
  followUpDue?: boolean;
  awaitingLabel?: string;
  operationalLabels?: string[];
  interviewAt?: any;
  hasActiveSequence?: boolean;
}

interface Job {
  id: string;
  title: string;
  [key: string]: any;
}

/** Reads `?jobId=` for deep links from job workspace (needs Suspense boundary). */
function MessagesJobIdSync({
  jobs,
  setSelectedJobId,
}: {
  jobs: Job[];
  setSelectedJobId: React.Dispatch<React.SetStateAction<string>>;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("jobId");
    if (!q || !jobs.length) return;
    if (jobs.some((j) => j.id === q)) setSelectedJobId(q);
  }, [searchParams, jobs, setSelectedJobId]);
  return null;
}

export default function MessagesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<ThreadWithParticipants[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const initialJobFromUrl = (() => {
    try {
      const q = searchParams.get("jobId");
      return q && q.trim() ? q.trim() : "all";
    } catch {
      return "all";
    }
  })();
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobFromUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep filter aligned with URL (browser back/forward, deep links).
  useEffect(() => {
    const q = searchParams.get("jobId")?.trim();
    const next = q && q.length ? q : "all";
    setSelectedJobId((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
    
    // Redirect candidates to their specific messages page
    if (profile && profile.role === 'JOB_SEEKER') {
      router.push("/messages/candidate");
      return;
    }
  }, [user, loading, profile, router]);

  // Fetch employer's jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) return;
      
      try {
        let jobsData: any[] = [];
        
        if (profile.role === 'RECRUITER' && profile.companyId) {
          const { data, error } = await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false);
          if (!error && data) {
            jobsData = data;
          }
        } else {
          const { data, error } = await getEmployerJobs(user.uid);
          if (!error && data) {
            jobsData = data;
          }
        }
        
        setJobs(jobsData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      }
    };

    fetchJobs();
  }, [user, profile]);

  useEffect(() => {
    const fetchThreads = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const scopedJobId = selectedJobId !== 'all' ? selectedJobId : null;
        const { data: threadsData, error: threadsError } = await getUserMessageThreads(user.uid, {
          jobId: scopedJobId,
        });
        
        if (threadsError) {
          setError(`Failed to load message threads: ${threadsError}`);
          return;
        }
        
        if (!threadsData || threadsData.length === 0) {
          setThreads([]);
          return;
        }
        
        const threadRows = threadsData as any[];
        const otherIds = Array.from(
          new Set(
            threadRows
              .map((thread) =>
                Array.isArray(thread.participantIds)
                  ? (thread.participantIds as string[]).find((id) => id !== user.uid)
                  : undefined
              )
              .filter(Boolean)
          )
        ) as string[];
        const profileEntries = await Promise.all(
          otherIds.map(async (id) => {
            const { data: otherProfile, error: otherProfileError } = await getParticipantProfileForMessaging(
              id,
              profile?.role
            );
            if (otherProfileError) {
              // Keep inbox usable even if one participant profile is restricted or missing.
              return [id, null] as const;
            }
            return [id, otherProfile || null] as const;
          })
        );
        const profileById = new Map<string, any>(profileEntries);

        // Fetch other participant info and job associations for each thread
        const threadsWithParticipants = await Promise.all(
          threadRows.map(async (thread: any) => {
            const otherId = Array.isArray(thread.participantIds)
              ? (thread.participantIds as string[]).find((id) => id !== user.uid)
              : undefined;
            const otherParticipant = otherId ? profileById.get(otherId) || null : null;

            // Check messages for workflow context (only for employers/recruiters)
            let jobId: string | undefined = undefined;
            let jobTitle: string | undefined = undefined;
            let pipelineStage: string | undefined = undefined;
            let nextFollowUpAt: any = null;
            let followUpDue = false;
            let lastMessage: any = null;
            let awaitingLabel: string | undefined = undefined;
            let interviewAt: any = null;
            let hasActiveSequence = false;
            let activeSequenceRow: any = null;

            const threadJob = threadDataToJobDetails(thread as unknown as Record<string, unknown>);
            if (threadJob?.jobId) {
              jobId = threadJob.jobId;
              jobTitle = threadJob.jobTitle || undefined;
            }

            if (profile && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER')) {
              const lastMessageSenderId = String(thread?.lastMessageSenderId || "");
              const lastMessagePreview = String(thread?.lastMessagePreview || "");
              if (lastMessageSenderId) {
                lastMessage = { senderId: lastMessageSenderId, content: lastMessagePreview };
                awaitingLabel = lastMessageSenderId === user.uid ? "Awaiting candidate" : "Candidate replied";
              } else if (lastMessagePreview) {
                lastMessage = { content: lastMessagePreview };
              }
            }

            if (jobId && otherId && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER')) {
              const { data: pipelineEntry } = await getPipelineEntryForJobCandidate(jobId, otherId);
              if (pipelineEntry) {
                pipelineStage = normalizePipelineStage(pipelineEntry.stage);
                nextFollowUpAt = pipelineEntry.nextFollowUpAt || null;
                if (nextFollowUpAt) {
                  const nextDate = nextFollowUpAt?.toDate ? nextFollowUpAt.toDate() : new Date(nextFollowUpAt);
                  followUpDue = nextDate.getTime() < Date.now();
                }
              }
            }
            const awaitingReply =
              lastMessage == null ? null : lastMessage.senderId === user.uid;
            const operationalLabels = getCommunicationStatusDisplayLabels({
              pipelineStage,
              hasEvaluation: false,
              isEvaluationComplete: true,
              reviewStatus: null,
              awaitingCandidateReply: awaitingReply,
              nextFollowUpAt,
              interviewAt,
              sequence: activeSequenceRow,
            });
            
            return {
              thread: thread as any as MessageThread,
              otherParticipant,
              lastMessage,
              jobId,
              jobTitle,
              pipelineStage,
              nextFollowUpAt,
              followUpDue,
              awaitingLabel,
              operationalLabels,
              interviewAt,
              hasActiveSequence,
            } as ThreadWithParticipants;
          })
        );
        
        setThreads(threadsWithParticipants);
        
      } catch (err) {
        setError(`Failed to load message threads: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, [user, profile, selectedJobId]);

  // Filter threads based on selected job
  const filteredThreads = useMemo(() => {
    if (selectedJobId === 'all') {
      return threads;
    }
    return threads.filter(thread => thread.jobId === selectedJobId);
  }, [threads, selectedJobId]);

  // Only show job filter for employers/recruiters
  const showJobFilter =
    (profile?.role === "EMPLOYER" || profile?.role === "RECRUITER") && jobs.length > 0;

  // Keep URL in sync with selected requisition scope without breaking default inbox behavior.
  useEffect(() => {
    if (!showJobFilter) return;
    const current = searchParams.get("jobId") || "all";
    if (current === selectedJobId) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (selectedJobId === "all") params.delete("jobId");
    else params.set("jobId", selectedJobId);
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next, { scroll: false });
  }, [showJobFilter, searchParams, selectedJobId, pathname, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-sky-600 hover:text-navy-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const followUpDueCount = filteredThreads.filter((thread) => thread.followUpDue).length;
  const awaitingCandidateCount = filteredThreads.filter((thread) => thread.awaitingLabel === 'Awaiting candidate').length;
  const overdueCount = filteredThreads.filter((thread) => (thread.operationalLabels || []).includes('Overdue')).length;
  const interviewScheduledCount = filteredThreads.filter((thread) => (thread.operationalLabels || []).includes('Interview scheduled')).length;
  const scopedInboxJob =
    selectedJobId !== "all" ? jobs.find((j) => j.id === selectedJobId) : undefined;

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* FIX2: flat recruiter shell (replaces inline gradient) */}
      <Suspense fallback={null}>
        <MessagesJobIdSync jobs={jobs} setSelectedJobId={setSelectedJobId} />
      </Suspense>
      <div className="w-full md:max-w-7xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 pb-4 sm:pb-6 md:pb-10 min-w-0">
        {/* Page Intro — FIX1: stats use responsive grid + min-w-0 so narrow viewports never overflow */}
        <section className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-6 md:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Recruiter messages</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-2 break-words">Messages</h1>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 break-words">
                {selectedJobId !== "all" && scopedInboxJob
                  ? `Inbox for “${scopedInboxJob.title}” — only threads linked to this requisition.`
                  : "All conversations across your requisitions. Filter by job to focus one role."}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                <Link href={getEmployerTemplatesUrl()} className="text-sky-700 font-semibold hover:underline">
                  Message templates
                </Link>{" "}
                — reusable outreach snippets (also under Settings → messaging tools).
              </p>
            </div>
            <div className="w-full min-w-0 lg:w-auto lg:shrink-0">
              <div className="grid grid-cols-2 gap-2 text-xs w-full min-w-0 sm:grid-cols-3 md:grid-cols-5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-slate-700 sm:px-3">
                  Threads <span className="font-semibold text-navy-900">{filteredThreads.length}</span>
                </div>
                <div className="rounded-lg border border-navy-200 bg-navy-50 px-2 py-2 text-navy-900 sm:px-3">
                  Due <span className="font-semibold">{followUpDueCount}</span>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-amber-700 sm:px-3">
                  Awaiting <span className="font-semibold">{awaitingCandidateCount}</span>
                </div>
                <div className="rounded-lg border border-navy-200 bg-navy-50 px-2 py-2 text-navy-900 sm:px-3">
                  Overdue <span className="font-semibold">{overdueCount}</span>
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-sky-950 sm:px-3 md:col-span-1 col-span-2 sm:col-span-1">
                  Interviews <span className="font-semibold">{interviewScheduledCount}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {selectedJobId !== "all" && scopedInboxJob && (
          <section className="w-full min-w-0 mb-3 sm:mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Job inbox</p>
            <p className="text-sm font-bold text-navy-900 mt-0.5">{scopedInboxJob.title}</p>
            <p className="text-xs text-slate-600 mt-1">
              You are viewing messages for this requisition only.{" "}
              <Link href={getJobOverviewUrl(selectedJobId)} className="font-semibold text-sky-800 hover:underline">
                Back to Job Workspace
              </Link>
            </p>
          </section>
        )}

        {/* Job Filter - Only show for employers/recruiters */}
        {showJobFilter && (
          <section className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-navy-900">Filter by requisition:</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm text-navy-900 bg-white"
                >
                  <option value="all">All Jobs ({threads.length})</option>
                  {jobs.map((job) => {
                    const threadCount = threads.filter(t => t.jobId === job.id).length;
                    return (
                      <option key={job.id} value={job.id}>
                        {job.title} ({threadCount})
                      </option>
                    );
                  })}
                </select>
              </div>
              {selectedJobId !== 'all' && (
                <button
                  onClick={() => setSelectedJobId('all')}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear requisition
                </button>
              )}
            </div>
          </section>
        )}

        {/* Threads List */}
        <section className="w-full min-w-0">
          <div className="space-y-3">
          {filteredThreads.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 p-8 sm:p-10 md:p-12 text-center">
              <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy-900 mb-2">
                {selectedJobId !== 'all' ? 'No messages for this job' : 'No messages yet'}
              </h3>
              <p className="text-slate-500 mb-6">
                {selectedJobId !== 'all' 
                  ? 'Try selecting a different job or send messages to candidates for this job.'
                  : 'Start connecting with candidates or employers to begin conversations'
                }
              </p>
              {selectedJobId !== 'all' && (
                <button
                  onClick={() => setSelectedJobId('all')}
                  className="inline-flex items-center px-4 py-2 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors mb-4"
                >
                  View full inbox
                </button>
              )}
              {selectedJobId === 'all' && (
                <Link
                  href="/search/candidates"
                  className="inline-flex items-center px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
                >
                  <User className="h-4 w-4 mr-2" />
                  Find candidates
                </Link>
              )}
              {selectedJobId !== "all" && (
                <Link
                  href={getCandidatesSearchUrl(selectedJobId)}
                  className="inline-flex items-center px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
                >
                  <User className="h-4 w-4 mr-2" />
                  Find candidates for this job
                </Link>
              )}
            </div>
          ) : (
            filteredThreads.map(({ thread, otherParticipant, jobId, jobTitle, pipelineStage, nextFollowUpAt, followUpDue, awaitingLabel, operationalLabels, hasActiveSequence, lastMessage }) => {
              const linkJobId =
                jobId ||
                (selectedJobId !== "all" && selectedJobId ? selectedJobId : "");
              const nextStep = getRecruiterNextStep({
                pipelineStage,
                awaitingCandidateReply:
                  awaitingLabel === "Awaiting candidate" ? true : awaitingLabel === "Awaiting recruiter" ? false : null,
                nextFollowUpAt,
                interviewAt: (operationalLabels || []).includes("Interview scheduled") ? new Date() : null,
                sequence: hasActiveSequence ? { status: "ACTIVE" } : null,
              });
              return (
              <Link
                key={thread.id}
                href={
                  linkJobId
                    ? `/messages/${thread.id}?jobId=${encodeURIComponent(linkJobId)}`
                    : `/messages/${thread.id}`
                }
                className="block bg-white/90 backdrop-blur-sm rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 p-4 sm:p-5 hover:shadow-md hover:border-sky-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {otherParticipant?.profileImageUrl ? (
                        <img
                          src={otherParticipant.profileImageUrl}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-navy-800" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-navy-900">
                          {otherParticipant 
                            ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || 'Unknown User'
                            : 'Unknown User'
                          }
                        </h3>
                        {jobTitle && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-sky-100 text-sky-700 rounded-full">
                            <Briefcase className="h-3 w-3" />
                            {jobTitle}
                          </span>
                        )}
                        {pipelineStage && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                            {pipelineStageLabel(pipelineStage)}
                          </span>
                        )}
                        {followUpDue && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-navy-50 text-navy-900 rounded-full border border-navy-200">
                            Follow-up due
                          </span>
                        )}
                        {hasActiveSequence && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-sky-100 text-sky-950 rounded-full border border-sky-200">
                            Sequence active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {otherParticipant?.headline || otherParticipant?.role || 'User'}
                      </p>
                      {lastMessage?.content && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {lastMessage.content}
                        </p>
                      )}
                      {nextFollowUpAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          Next follow-up: {new Date(nextFollowUpAt?.toDate ? nextFollowUpAt.toDate() : nextFollowUpAt).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Last activity: {thread.lastMessageAt ? new Date(thread.lastMessageAt.toDate ? thread.lastMessageAt.toDate() : thread.lastMessageAt).toLocaleDateString() : 'Recently'}
                      </p>
                      {awaitingLabel && <p className="text-xs text-slate-600 mt-1">{awaitingLabel}</p>}
                      <p className="text-xs text-navy-800 mt-1 font-medium">{nextStep}</p>
                      {operationalLabels && operationalLabels.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {operationalLabels.map((label) => (
                            <span
                              key={`${thread.id}-${label}`}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                label === "Overdue"
                                  ? "bg-navy-50 text-navy-900 border border-navy-200"
                                  : label === "Follow-up due"
                                    ? "bg-sky-50 text-sky-950 border border-sky-200"
                                    : label === "Interview scheduled"
                                      ? "bg-sky-100 text-navy-900 border border-sky-200"
                                      : label === "Sequence active"
                                        ? "bg-slate-100 text-navy-900 border border-slate-200"
                                        : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </div>
              </Link>
              );
            })
          )}
          </div>
        </section>
      </div>
    </main>
  );
}