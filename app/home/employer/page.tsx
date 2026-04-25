"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building, Search, Users, MessageSquare, Star, FileText, Lock } from "lucide-react";
import EmployerJobsList from "@/components/EmployerJobsList";
import {
  getCandidateUrl,
  getCandidatesSearchUrl,
  getEmployerPoolsUrl,
  getEmployerTemplatesUrl,
  getJobCompareUrl,
  getJobMatchesUrl,
  getJobPipelineUrl,
} from "@/lib/navigation";
import {
  getDocument,
  getEmployerJobs,
  getCompanyJobs,
  getUserMessageThreads,
  getThreadMessages,
  getPipelineByJob,
  queryDocuments,
  where,
  normalizePipelineStage,
  threadDataToJobDetails,
} from '@/lib/firebase-firestore';
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
} from '@/lib/decision-client';
import { fetchJobInterviews, fetchJobSequences } from '@/lib/communication-client';
import { fetchReviewAssignments } from "@/lib/collaboration-client";
import {
  summarizeCandidateEvaluations,
  type CandidateEvaluation,
  type CandidateReviewRequest,
  type JobEvaluationCriterion,
} from '@/lib/hiring-decision';
import { isSequenceStepDue } from "@/lib/communication-status";
import CompanyRatingDisplay from '@/components/CompanyRatingDisplay';
import UpcomingInterviewsPanel from "@/components/recruiter/UpcomingInterviewsPanel";

export default function EmployerHomePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [workQueueItems, setWorkQueueItems] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [workQueueCounts, setWorkQueueCounts] = useState({
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
    const loadNeedsAttention = async () => {
      if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) return;

      setAttentionLoading(true);
      try {
        const { data: jobs, error: jobsError } = profile.companyId
          ? await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false)
          : await getEmployerJobs(user.uid);
        if (jobsError || !jobs || jobs.length === 0) {
          setWorkQueueItems([]);
          setWorkQueueCounts({
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
          });
          return;
        }

        const now = Date.now();
        const nowDate = new Date();
        const endOfToday = new Date(nowDate);
        endOfToday.setHours(23, 59, 59, 999);
        const threeDaysFromNow = new Date(nowDate);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const queueItems: any[] = [];
        const upcomingRows: any[] = [];
        const seenJobCandidate = new Set<string>();
        const candidateCache = new Map<string, string>();
        let followUpDueCount = 0;
        let followUpDueTodayCount = 0;
        let awaitingResponseCount = 0;
        let newMatchesCount = 0;
        let awaitingReviewCount = 0;
        let evaluationIncompleteCount = 0;
        let finalistsPendingCount = 0;
        let interviewsSoonCount = 0;
        let activeSequencesCount = 0;
        let awaitingRecruiterReplyCount = 0;
        let sequenceStepsDueCount = 0;
        let interviewNeedsEvalCount = 0;
        const token = await user.getIdToken();

        const resolveCandidateName = async (candidateId: string) => {
          if (candidateCache.has(candidateId)) return candidateCache.get(candidateId) as string;
          const { data: candidate } = await getDocument('users', candidateId);
          const candidateProfile = (candidate || {}) as any;
          const candidateName = `${candidateProfile.firstName || ''} ${candidateProfile.lastName || ''}`.trim() || 'Candidate';
          candidateCache.set(candidateId, candidateName);
          return candidateName;
        };

        // "Awaiting response" matches the Messages inbox: last message in the thread is yours (waiting on the candidate).
        const { data: threadsData, error: threadsError } = await getUserMessageThreads(user.uid);
        const jobsWithRecruiterOutreach = new Set<string>();
        if (!threadsError && threadsData && threadsData.length > 0) {
          for (const thread of threadsData as any[]) {
            const otherId = Array.isArray(thread.participantIds)
              ? (thread.participantIds as string[]).find((id: string) => id !== user.uid)
              : undefined;
            if (!otherId) continue;
            try {
              const { data: threadMessages } = await getThreadMessages(thread.id);
              if (!threadMessages || threadMessages.length === 0) continue;

              const lastMessage = threadMessages[threadMessages.length - 1];
              const storedJob = threadDataToJobDetails(thread as Record<string, unknown>);
              const mostRecentWithJob = [...threadMessages]
                .reverse()
                .find((msg: any) => msg?.jobDetails?.jobId);
              const threadJobId =
                storedJob?.jobId ||
                (mostRecentWithJob?.jobDetails?.jobId ? String(mostRecentWithJob.jobDetails.jobId) : "");
              const threadJobTitle = threadJobId
                ? String((jobs as any[]).find((j) => j.id === threadJobId)?.title || "Job")
                : "Messages";
              const recruiterSentInThread = threadMessages.some((msg: any) => String(msg?.senderId || "") === user.uid);
              if (threadJobId && recruiterSentInThread) {
                jobsWithRecruiterOutreach.add(threadJobId);
              }
              const msgHref = threadJobId
                ? `/messages/${thread.id}?jobId=${encodeURIComponent(threadJobId)}`
                : `/messages/${thread.id}`;
              const candidateName = await resolveCandidateName(otherId);
              if (lastMessage?.senderId === user.uid) {
                awaitingResponseCount += 1;
                queueItems.push({
                  id: `await-msg-${thread.id}`,
                  candidateName,
                  candidateId: otherId,
                  jobId: threadJobId,
                  jobTitle: threadJobTitle,
                  reason: "Awaiting candidate reply (you sent the last message)",
                  href: msgHref,
                  tone: "amber",
                  priority: 2,
                });
              } else if (lastMessage?.senderId === otherId) {
                awaitingRecruiterReplyCount += 1;
                queueItems.push({
                  id: `await-recruiter-${thread.id}`,
                  candidateName,
                  candidateId: otherId,
                  jobId: threadJobId,
                  jobTitle: threadJobTitle,
                  reason: "Candidate replied — follow up in thread",
                  href: msgHref,
                  tone: "sky",
                  priority: 1.5,
                });
              }
            } catch {
              /* skip thread */
            }
          }
        }

        for (const job of jobs as any[]) {
          const { data: entries } = await getPipelineByJob(job.id);
          const pipelineCandidates = new Set<string>();
          const normalizedEntries = (entries || []).map((entry: any) => ({
            ...entry,
            stage: normalizePipelineStage(entry.stage),
          }));
          const [criteriaRes, evalRes, reviewsRes, sequencesRes, interviewsRes] = await Promise.all([
            fetchJobEvaluationCriteria(job.id, token),
            fetchJobEvaluations(job.id, token),
            fetchJobReviews(job.id, token),
            fetchJobSequences(job.id, token),
            fetchJobInterviews(job.id, token),
          ]);
          const activeCriteria = (criteriaRes.ok ? (criteriaRes.data.criteria || []) : [])
            .filter((c: JobEvaluationCriterion) => c.active !== false);
          const evalByCandidate = new Map<string, CandidateEvaluation[]>();
          for (const ev of (evalRes.ok ? ((evalRes.data.evaluations || []) as CandidateEvaluation[]) : [])) {
            const cid = String(ev.candidateId || '');
            if (!cid) continue;
            const list = evalByCandidate.get(cid) || [];
            list.push(ev);
            evalByCandidate.set(cid, list);
          }
          const reviewByCandidate = new Map<string, CandidateReviewRequest>();
          for (const rv of (reviewsRes.ok ? ((reviewsRes.data.reviews || []) as CandidateReviewRequest[]) : [])) {
            const cid = String(rv.candidateId || '');
            if (!cid) continue;
            if (!reviewByCandidate.has(cid)) reviewByCandidate.set(cid, rv);
          }
          const sequenceByCandidate = new Map<string, any>();
          for (const seq of (sequencesRes.ok ? (sequencesRes.data.sequences || []) : []) as any[]) {
            const cid = String(seq?.candidateId || '');
            if (!cid) continue;
            if (!sequenceByCandidate.has(cid)) sequenceByCandidate.set(cid, seq);
            if (String(seq?.status || '') === 'ACTIVE') activeSequencesCount += 1;
          }
          const interviewByCandidate = new Map<string, any>();
          for (const interview of (interviewsRes.ok ? (interviewsRes.data.interviews || []) : []) as any[]) {
            const cid = String(interview?.candidateId || '');
            if (!cid) continue;
            if (String(interview?.status || '') === 'CANCELLED') continue;
            if (!interviewByCandidate.has(cid)) interviewByCandidate.set(cid, interview);
            upcomingRows.push({
              ...interview,
              candidateName: await resolveCandidateName(cid),
              jobTitle: (job as any).title || "Job",
            });
            const atRaw = interview?.scheduledAt;
            const at = atRaw?.toDate ? atRaw.toDate() : (atRaw ? new Date(atRaw) : null);
            if (at && at.getTime() >= now && at.getTime() <= threeDaysFromNow.getTime()) {
              interviewsSoonCount += 1;
              queueItems.push({
                id: `interview-${job.id}-${cid}`,
                candidateName: await resolveCandidateName(cid),
                candidateId: cid,
                jobId: job.id,
                jobTitle: (job as any).title || 'Job',
                reason: `Interview ${String(interview?.status || 'scheduled').toLowerCase()} soon`,
                href: getCandidateUrl(cid, job.id),
                tone: 'sky',
                priority: 1.4,
              });
            }
          }

          const shortlistCount = normalizedEntries.filter((entry: any) => entry.stage === 'SHORTLIST').length;
          if (shortlistCount >= 2) {
            queueItems.push({
              id: `shortlist-compare-${job.id}`,
              candidateName: 'Compare shortlist',
              candidateId: '',
              jobId: job.id,
              jobTitle: (job as any).title || 'Job',
              reason: `${shortlistCount} shortlisted contenders — side-by-side decision`,
              href: getJobCompareUrl(job.id),
              tone: 'violet',
              priority: 1.8,
            });
          }

          for (const entry of normalizedEntries) {
            pipelineCandidates.add(entry.candidateId);
            const candidateName = await resolveCandidateName(entry.candidateId);
            const dedupeKey = `${entry.jobId}:${entry.candidateId}`;
            seenJobCandidate.add(dedupeKey);
            const evaluationSummary = summarizeCandidateEvaluations(
              evalByCandidate.get(String(entry.candidateId)) || [],
              activeCriteria
            );
            const reviewStatus = reviewByCandidate.get(String(entry.candidateId))?.status;
            const stage = normalizePipelineStage(entry.stage);
            const sequenceStatus = sequenceByCandidate.get(String(entry.candidateId))?.status;
            if (reviewStatus === 'REQUESTED') {
              awaitingReviewCount += 1;
              queueItems.push({
                id: `await-review-${entry.jobId}-${entry.candidateId}`,
                candidateName,
                candidateId: entry.candidateId,
                jobId: entry.jobId,
                jobTitle: (job as any).title || 'Job',
                reason: 'Waiting on hiring manager review',
                href: getCandidateUrl(entry.candidateId, entry.jobId),
                tone: 'violet',
                priority: 1.6,
              });
            }
            if ((stage === 'SHORTLIST' || stage === 'INTERVIEW' || stage === 'FINALIST') && !evaluationSummary.isComplete) {
              evaluationIncompleteCount += 1;
            }
            if (stage === 'FINALIST' && reviewStatus !== 'APPROVED') {
              finalistsPendingCount += 1;
            }

            const followUpRaw = (entry as any).nextFollowUpAt as any;
            const nextFollowUpDate = followUpRaw?.toDate
              ? followUpRaw.toDate()
              : followUpRaw
                ? new Date(followUpRaw)
                : null;

            if (nextFollowUpDate && nextFollowUpDate.getTime() < now) {
              followUpDueCount += 1;
              queueItems.push({
                id: entry.id,
                candidateName,
                candidateId: entry.candidateId,
                jobId: entry.jobId,
                jobTitle: (job as any).title || 'Job',
                reason: 'Follow-up overdue',
                href: getCandidateUrl(entry.candidateId, entry.jobId),
                tone: 'rose',
                priority: 1,
              });
            }
            if (nextFollowUpDate && nextFollowUpDate.getTime() >= now && nextFollowUpDate.getTime() <= endOfToday.getTime()) {
              followUpDueTodayCount += 1;
            }
            if (sequenceStatus === 'ACTIVE') {
              queueItems.push({
                id: `sequence-${entry.jobId}-${entry.candidateId}`,
                candidateName,
                candidateId: entry.candidateId,
                jobId: entry.jobId,
                jobTitle: (job as any).title || 'Job',
                reason: 'Active outreach sequence',
                href: getCandidateUrl(entry.candidateId, entry.jobId),
                tone: 'violet',
                priority: 2.3,
              });
            }
            const seqRow = sequenceByCandidate.get(String(entry.candidateId));
            if (seqRow && String(seqRow.status || "") === "ACTIVE" && isSequenceStepDue(seqRow, new Date())) {
              sequenceStepsDueCount += 1;
              queueItems.push({
                id: `seq-due-${entry.jobId}-${entry.candidateId}`,
                candidateName,
                candidateId: entry.candidateId,
                jobId: entry.jobId,
                jobTitle: (job as any).title || "Job",
                reason: "Sequence reminder due — send the next message yourself",
                href: getCandidateUrl(entry.candidateId, entry.jobId),
                tone: "violet",
                priority: 1.2,
              });
            }
            const interviewRow = interviewByCandidate.get(String(entry.candidateId));
            const interviewAtRaw = interviewRow?.scheduledAt;
            if (
              interviewAtRaw &&
              (stage === "INTERVIEW" || stage === "FINALIST") &&
              !evaluationSummary.isComplete
            ) {
              interviewNeedsEvalCount += 1;
              queueItems.push({
                id: `interview-eval-${entry.jobId}-${entry.candidateId}`,
                candidateName,
                candidateId: entry.candidateId,
                jobId: entry.jobId,
                jobTitle: (job as any).title || "Job",
                reason: "Interview scheduled — structured evaluation still incomplete",
                href: getCandidateUrl(entry.candidateId, entry.jobId),
                tone: "indigo",
                priority: 1.25,
              });
            }

          }

          const { data: matches } = await queryDocuments('jobMatches', [where('jobId', '==', job.id)]);
          const strongUnactedMatches = ((matches || []) as any[])
            .filter((m: any) => typeof m.overallScore === 'number' && m.overallScore >= 80)
            .sort((a: any, b: any) => Number(b.overallScore || 0) - Number(a.overallScore || 0))
            .slice(0, 4);

          for (const match of strongUnactedMatches as any[]) {
            if (!match.candidateId || pipelineCandidates.has(match.candidateId)) continue;
            const dedupeKey = `${job.id}:${match.candidateId}`;
            if (seenJobCandidate.has(dedupeKey)) continue;
            seenJobCandidate.add(dedupeKey);
            const candidateName = await resolveCandidateName(match.candidateId);
            newMatchesCount += 1;
            queueItems.push({
              id: `new-${job.id}-${match.candidateId}`,
              candidateName,
              candidateId: match.candidateId,
              jobId: job.id,
              jobTitle: (job as any).title || 'Job',
              reason: 'New match to review',
              href: getJobMatchesUrl(job.id),
              tone: 'sky',
              priority: 3,
            });
          }
        }

        queueItems.sort((a, b) => a.priority - b.priority);
        setWorkQueueItems(queueItems.slice(0, 12));
        setUpcomingInterviews(upcomingRows);
        setWorkQueueCounts({
          followUpDueToday: followUpDueTodayCount,
          followUpDue: followUpDueCount,
          awaitingResponse: awaitingResponseCount,
          awaitingRecruiterReply: awaitingRecruiterReplyCount,
          newMatches: newMatchesCount,
          awaitingReview: awaitingReviewCount,
          evaluationIncomplete: evaluationIncompleteCount,
          finalistsPending: finalistsPendingCount,
          interviewsSoon: interviewsSoonCount,
          activeSequences: activeSequencesCount,
          sequenceStepsDue: sequenceStepsDueCount,
          interviewNeedsEval: interviewNeedsEvalCount,
        });
      } finally {
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
              {attentionLoading ? 'Loading...' : `${workQueueItems.length} items ready`}
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
                {workQueueCounts.followUpDue === 0 &&
                  workQueueCounts.awaitingRecruiterReply === 0 &&
                  workQueueCounts.awaitingResponse === 0 &&
                  workQueueCounts.newMatches === 0 &&
                  workQueueCounts.awaitingReview === 0 &&
                  workQueueCounts.interviewNeedsEval === 0 && (
                  <span>Nothing urgent in these categories.</span>
                )}
              </p>
              {workQueueItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-navy-900">Queue is clear</p>
                  <p className="text-xs text-slate-500 mt-1">No urgent follow-ups or pending match actions right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workQueueItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        item.tone === "rose"
                          ? "border-navy-200 bg-navy-50 text-navy-900"
                          : item.tone === "amber"
                            ? "border-sky-200 bg-sky-50 text-sky-950"
                            : item.tone === "violet"
                              ? "border-sky-200 bg-sky-50 text-navy-900"
                              : item.tone === "indigo"
                                ? "border-slate-200 bg-slate-50 text-navy-900"
                                : "border-sky-200 bg-sky-50 text-sky-900"
                      }`}
                    >
                      <Link href={item.href} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{item.candidateName} · {item.jobTitle}</p>
                          <p className="text-xs opacity-80">{item.reason}</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white">
                          Open
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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