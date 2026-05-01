import {
  getCompanyJobs,
  getDocument,
  getEmployerJobs,
  getPipelineByJob,
  getThreadMessages,
  getUserMessageThreads,
  normalizePipelineStage,
  queryDocuments,
  threadDataToJobDetails,
  where,
} from "@/lib/firebase-firestore";
import {
  fetchCandidateDebriefs,
  fetchInterviewFeedback,
  fetchJobInterviews,
  fetchJobSequences,
} from "@/lib/communication-client";
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
} from "@/lib/decision-client";
import { isSequenceStepDue } from "@/lib/communication-status";
import { summarizeCandidateEvaluations, type CandidateEvaluation, type CandidateReviewRequest, type JobEvaluationCriterion } from "@/lib/hiring-decision";
import {
  getCandidateUrl,
  getEmployerFeedbackUrl,
  getJobCompareUrl,
  getJobMatchesUrl,
  getJobOverviewUrl,
} from "@/lib/navigation";

export type WorkQueueCategory =
  | "urgent"
  | "interviews"
  | "offers"
  | "messages"
  | "reviews"
  | "followups"
  | "sourcing"
  | "other";

/** Short label for category chips in dashboard / work queue UI. */
export function workQueueCategoryLabel(category: WorkQueueCategory): string {
  if (category === "followups") return "Follow-up";
  if (category === "interviews") return "Interview";
  if (category === "offers") return "Offer";
  if (category === "messages") return "Message";
  if (category === "reviews") return "Review";
  if (category === "sourcing") return "Sourcing";
  if (category === "urgent") return "Urgent";
  return "Other";
}

export type WorkQueueTask = {
  id: string;
  type: string;
  category: WorkQueueCategory;
  priority: number;
  title: string;
  subtitle: string;
  jobId: string | null;
  jobTitle: string;
  candidateId: string | null;
  candidateName: string;
  threadId: string | null;
  offerId: string | null;
  interviewId: string | null;
  href: string;
  actionLabel: string;
  dedupeKey: string;
  createdAt: string | null;
  dueAt: string | null;
  source: string;
};

export type WorkQueueCounts = {
  total: number;
  urgent: number;
  interviews: number;
  offers: number;
  messages: number;
  reviews: number;
  followups: number;
  sourcing: number;
  other: number;
  followUpDueToday: number;
  followUpDue: number;
  awaitingResponse: number;
  awaitingRecruiterReply: number;
  newMatches: number;
  awaitingReview: number;
  evaluationIncomplete: number;
  finalistsPending: number;
  interviewsSoon: number;
  activeSequences: number;
  sequenceStepsDue: number;
  interviewNeedsEval: number;
  offersPendingApproval: number;
  offersReadyToSend: number;
  offersAwaitingResponse: number;
  offersAcceptedNeedClose: number;
  scorecardsDue: number;
  debriefsBlocked: number;
  debriefsReady: number;
  interviewsNeedingFollowUp: number;
};

export type WorkQueueBuildResult = {
  tasks: WorkQueueTask[];
  upcomingInterviews: any[];
  counts: WorkQueueCounts;
};

type BuildArgs = {
  user: { uid: string; getIdToken: () => Promise<string> };
  profile: { role?: string; companyId?: string; isCompanyOwner?: boolean };
};

function toSafeDate(value: unknown): Date | null {
  const v: any = value;
  if (!v) return null;
  if (typeof v.toDate === "function") {
    const d = v.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v._seconds === "number") {
    const d = new Date(v._seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v.seconds === "number") {
    const d = new Date(v.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(value: unknown): string | null {
  const d = toSafeDate(value);
  return d ? d.toISOString() : null;
}

function toTask(input: {
  id: string;
  type: string;
  category: WorkQueueCategory;
  priority: number;
  candidateName?: string;
  candidateId?: string | null;
  jobId?: string | null;
  jobTitle?: string;
  threadId?: string | null;
  offerId?: string | null;
  interviewId?: string | null;
  subtitle: string;
  href: string;
  dueAt?: unknown;
  createdAt?: unknown;
  source: string;
}): WorkQueueTask {
  const candidateName = String(input.candidateName || "Candidate");
  const jobTitle = String(input.jobTitle || "Job");
  const title = `${candidateName} · ${jobTitle}`;
  return {
    id: String(input.id),
    type: input.type,
    category: input.category,
    priority: Number(input.priority),
    title,
    subtitle: input.subtitle,
    jobId: input.jobId ? String(input.jobId) : null,
    jobTitle,
    candidateId: input.candidateId ? String(input.candidateId) : null,
    candidateName,
    threadId: input.threadId ? String(input.threadId) : null,
    offerId: input.offerId ? String(input.offerId) : null,
    interviewId: input.interviewId ? String(input.interviewId) : null,
    href: input.href,
    actionLabel: "Open task",
    dedupeKey: `${String(input.jobId || "none")}:${String(input.candidateId || "none")}`,
    createdAt: toIso(input.createdAt),
    dueAt: toIso(input.dueAt),
    source: input.source,
  };
}

function compareTasks(a: WorkQueueTask, b: WorkQueueTask): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return bCreated - aCreated;
}

export function selectDashboardTasks(tasks: WorkQueueTask[], limit = 5): WorkQueueTask[] {
  const out: WorkQueueTask[] = [];
  const seen = new Set<string>();
  for (const task of tasks) {
    if (out.length >= limit) break;
    const key = task.dedupeKey;
    if (task.candidateId && task.jobId && seen.has(key)) continue;
    out.push(task);
    if (task.candidateId && task.jobId) {
      seen.add(key);
    }
  }
  return out;
}

export async function buildRecruiterWorkQueue({ user, profile }: BuildArgs): Promise<WorkQueueBuildResult> {
  const role = String(profile?.role || "");
  if (!user || !profile || (role !== "EMPLOYER" && role !== "RECRUITER")) {
    return {
      tasks: [],
      upcomingInterviews: [],
      counts: {
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
      },
    };
  }

  const { data: jobs, error: jobsError } = profile.companyId
    ? await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false)
    : await getEmployerJobs(user.uid);

  if (jobsError || !jobs || jobs.length === 0) {
    return {
      tasks: [],
      upcomingInterviews: [],
      counts: {
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
      },
    };
  }

  const now = Date.now();
  const nowDate = new Date();
  const endOfToday = new Date(nowDate);
  endOfToday.setHours(23, 59, 59, 999);
  const threeDaysFromNow = new Date(nowDate);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const tasks: WorkQueueTask[] = [];
  const upcomingRows: any[] = [];
  const seenJobCandidate = new Set<string>();
  const candidateCache = new Map<string, string>();
  const seenOfferQueue = new Map<string, number>();
  const token = await user.getIdToken();

  let followUpDueCount = 0;
  let followUpDueTodayCount = 0;
  let awaitingResponseCount = 0;
  let awaitingRecruiterReplyCount = 0;
  let newMatchesCount = 0;
  let awaitingReviewCount = 0;
  let evaluationIncompleteCount = 0;
  let finalistsPendingCount = 0;
  let interviewsSoonCount = 0;
  let activeSequencesCount = 0;
  let sequenceStepsDueCount = 0;
  let interviewNeedsEvalCount = 0;
  let offersPendingApprovalCount = 0;
  let offersReadyToSendCount = 0;
  let offersAwaitingResponseCount = 0;
  let offersAcceptedNeedCloseCount = 0;
  let scorecardsDueCount = 0;
  let debriefsBlockedCount = 0;
  let debriefsReadyCount = 0;

  const resolveCandidateName = async (candidateId: string) => {
    if (candidateCache.has(candidateId)) return candidateCache.get(candidateId) as string;
    const { data: candidate } = await getDocument("publicCandidateProfiles", candidateId);
    const candidateProfile = (candidate || {}) as any;
    const candidateName = `${candidateProfile.firstName || ""} ${candidateProfile.lastName || ""}`.trim() || "Candidate";
    candidateCache.set(candidateId, candidateName);
    return candidateName;
  };

  const { data: threadsData, error: threadsError } = await getUserMessageThreads(user.uid);
  if (!threadsError && threadsData && threadsData.length > 0) {
    const threadRows = await Promise.all(
      (threadsData as any[]).map(async (thread) => {
        const otherId = Array.isArray(thread.participantIds)
          ? (thread.participantIds as string[]).find((id: string) => id !== user.uid)
          : undefined;
        if (!otherId) return null;
        try {
          const storedJob = threadDataToJobDetails(thread as Record<string, unknown>);
          const threadJobId = storedJob?.jobId || "";
          const threadJobTitle = threadJobId ? String((jobs as any[]).find((j) => j.id === threadJobId)?.title || "Job") : "Messages";
          let lastMessageSenderId = String((thread as any)?.lastMessageSenderId || "");
          if (!lastMessageSenderId) {
            const { data: threadMessages } = await getThreadMessages(thread.id);
            if (threadMessages && threadMessages.length > 0) {
              const lastMessage = threadMessages[threadMessages.length - 1];
              lastMessageSenderId = String(lastMessage?.senderId || "");
            }
          }
          const msgHref = threadJobId
            ? `/messages/${thread.id}?jobId=${encodeURIComponent(threadJobId)}`
            : `/messages/${thread.id}`;
          const candidateName = await resolveCandidateName(otherId);
          if (lastMessageSenderId === user.uid) {
            awaitingResponseCount += 1;
            return toTask({
              id: `await-msg-${thread.id}`,
              type: "awaiting_candidate_reply",
              category: "messages",
              priority: 2,
              candidateName,
              candidateId: otherId,
              jobId: threadJobId || null,
              jobTitle: threadJobTitle,
              threadId: thread.id,
              subtitle: "Awaiting candidate reply (you sent the last message)",
              href: msgHref,
              source: "messages",
            });
          }
          if (lastMessageSenderId === otherId) {
            awaitingRecruiterReplyCount += 1;
            return toTask({
              id: `await-recruiter-${thread.id}`,
              type: "candidate_replied",
              category: "messages",
              priority: 1.5,
              candidateName,
              candidateId: otherId,
              jobId: threadJobId || null,
              jobTitle: threadJobTitle,
              threadId: thread.id,
              subtitle: "Candidate replied — follow up in thread",
              href: msgHref,
              source: "messages",
            });
          }
        } catch {
          return null;
        }
        return null;
      })
    );
    for (const row of threadRows) {
      if (row) tasks.push(row);
    }
  }

  for (const job of jobs as any[]) {
    const { data: entries } = await getPipelineByJob(job.id);
    const pipelineCandidates = new Set<string>();
    const normalizedEntries = (entries || []).map((entry: any) => ({
      ...entry,
      stage: normalizePipelineStage(entry.stage),
    }));
    const [criteriaRes, evalRes, reviewsRes, sequencesRes, interviewsRes, feedbackRes, debriefRes] = await Promise.all([
      fetchJobEvaluationCriteria(job.id, token),
      fetchJobEvaluations(job.id, token),
      fetchJobReviews(job.id, token),
      fetchJobSequences(job.id, token),
      fetchJobInterviews(job.id, token),
      fetchInterviewFeedback(job.id, token),
      fetchCandidateDebriefs(job.id, token),
    ]);
    const activeCriteria = (criteriaRes.ok ? (criteriaRes.data.criteria || []) : []).filter((c: JobEvaluationCriterion) => c.active !== false);
    const evalByCandidate = new Map<string, CandidateEvaluation[]>();
    for (const ev of (evalRes.ok ? ((evalRes.data.evaluations || []) as CandidateEvaluation[]) : [])) {
      const cid = String(ev.candidateId || "");
      if (!cid) continue;
      const list = evalByCandidate.get(cid) || [];
      list.push(ev);
      evalByCandidate.set(cid, list);
    }
    const reviewByCandidate = new Map<string, CandidateReviewRequest>();
    for (const rv of (reviewsRes.ok ? ((reviewsRes.data.reviews || []) as CandidateReviewRequest[]) : [])) {
      const cid = String(rv.candidateId || "");
      if (!cid) continue;
      if (!reviewByCandidate.has(cid)) reviewByCandidate.set(cid, rv);
    }
    const sequenceByCandidate = new Map<string, any>();
    for (const seq of (sequencesRes.ok ? (sequencesRes.data.sequences || []) : []) as any[]) {
      const cid = String(seq?.candidateId || "");
      if (!cid) continue;
      if (!sequenceByCandidate.has(cid)) sequenceByCandidate.set(cid, seq);
      if (String(seq?.status || "") === "ACTIVE") activeSequencesCount += 1;
    }
    const interviewByCandidate = new Map<string, any>();
    for (const interview of (interviewsRes.ok ? (interviewsRes.data.interviews || []) : []) as any[]) {
      const cid = String(interview?.candidateId || "");
      if (!cid) continue;
      if (String(interview?.status || "") === "CANCELLED") continue;
      if (!interviewByCandidate.has(cid)) interviewByCandidate.set(cid, interview);
      upcomingRows.push({
        ...interview,
        candidateId: cid,
        jobId: job.id,
        candidateName: await resolveCandidateName(cid),
        jobTitle: (job as any).title || "Job",
      });
      const at = toSafeDate(interview?.scheduledAt);
      if (at && at.getTime() >= now && at.getTime() <= threeDaysFromNow.getTime()) {
        interviewsSoonCount += 1;
        tasks.push(
          toTask({
            id: `interview-${job.id}-${cid}`,
            type: "interview_soon",
            category: "interviews",
            priority: 1.4,
            candidateName: await resolveCandidateName(cid),
            candidateId: cid,
            jobId: job.id,
            jobTitle: String(job?.title || "Job"),
            interviewId: String(interview?.id || ""),
            subtitle: `Interview ${String(interview?.status || "scheduled").toLowerCase()} soon`,
            href: getCandidateUrl(cid, job.id),
            dueAt: interview?.scheduledAt,
            source: "interviews",
          })
        );
      }
    }
    const feedbackByCandidate = new Map<string, any[]>();
    for (const row of (feedbackRes.ok ? (feedbackRes.data.feedback || []) : []) as any[]) {
      const cid = String(row?.candidateId || "");
      if (!cid) continue;
      const list = feedbackByCandidate.get(cid) || [];
      list.push(row);
      feedbackByCandidate.set(cid, list);
      if (
        String(row?.interviewerUserId || "") === user.uid &&
        (String(row?.status || "") === "REQUESTED" || String(row?.status || "") === "IN_PROGRESS")
      ) {
        scorecardsDueCount += 1;
        tasks.push(
          toTask({
            id: `feedback-me-${job.id}-${row.id}`,
            type: String(row?.status || "") === "IN_PROGRESS" ? "scorecard_draft_pending" : "scorecard_due",
            category: "interviews",
            priority: 1.1,
            candidateName: await resolveCandidateName(cid),
            candidateId: cid,
            jobId: job.id,
            jobTitle: String(job?.title || "Job"),
            subtitle: String(row?.status || "") === "IN_PROGRESS" ? "Scorecard draft pending submit" : "Scorecard due from me",
            href: getEmployerFeedbackUrl(),
            source: "feedback",
          })
        );
      }
    }
    const debriefByCandidate = new Map<string, any>();
    for (const row of (debriefRes.ok ? (debriefRes.data.debriefs || []) : []) as any[]) {
      const cid = String(row?.candidateId || "");
      if (!cid || debriefByCandidate.has(cid)) continue;
      debriefByCandidate.set(cid, row);
    }

    const shortlistCount = normalizedEntries.filter((entry: any) => entry.stage === "SHORTLIST").length;
    if (shortlistCount >= 2) {
      tasks.push(
        toTask({
          id: `shortlist-compare-${job.id}`,
          type: "shortlist_compare",
          category: "reviews",
          priority: 1.8,
          candidateName: "Compare shortlist",
          candidateId: null,
          jobId: job.id,
          jobTitle: String(job?.title || "Job"),
          subtitle: `${shortlistCount} shortlisted contenders — side-by-side decision`,
          href: getJobCompareUrl(job.id),
          source: "pipeline",
        })
      );
    }

    for (const entry of normalizedEntries) {
      pipelineCandidates.add(entry.candidateId);
      const candidateName = await resolveCandidateName(entry.candidateId);
      const dedupeKey = `${entry.jobId}:${entry.candidateId}`;
      seenJobCandidate.add(dedupeKey);
      const evaluationSummary = summarizeCandidateEvaluations(evalByCandidate.get(String(entry.candidateId)) || [], activeCriteria);
      const reviewStatus = reviewByCandidate.get(String(entry.candidateId))?.status;
      const stage = normalizePipelineStage(entry.stage);
      const sequenceStatus = sequenceByCandidate.get(String(entry.candidateId))?.status;
      if (reviewStatus === "REQUESTED") {
        awaitingReviewCount += 1;
        tasks.push(
          toTask({
            id: `await-review-${entry.jobId}-${entry.candidateId}`,
            type: "awaiting_hiring_manager_review",
            category: "reviews",
            priority: 1.6,
            candidateName,
            candidateId: entry.candidateId,
            jobId: entry.jobId,
            jobTitle: String(job?.title || "Job"),
            subtitle: "Waiting on hiring manager review",
            href: getCandidateUrl(entry.candidateId, entry.jobId),
            source: "reviews",
          })
        );
      }
      if ((stage === "SHORTLIST" || stage === "INTERVIEW" || stage === "FINALIST") && !evaluationSummary.isComplete) {
        evaluationIncompleteCount += 1;
      }
      if (stage === "FINALIST" && reviewStatus !== "APPROVED") {
        finalistsPendingCount += 1;
      }

      const nextFollowUpDate = toSafeDate((entry as any).nextFollowUpAt);
      if (nextFollowUpDate && nextFollowUpDate.getTime() < now) {
        followUpDueCount += 1;
        tasks.push(
          toTask({
            id: String(entry.id),
            type: "follow_up_overdue",
            category: "followups",
            priority: 1,
            candidateName,
            candidateId: entry.candidateId,
            jobId: entry.jobId,
            jobTitle: String(job?.title || "Job"),
            subtitle: "Follow-up overdue",
            href: getCandidateUrl(entry.candidateId, entry.jobId),
            dueAt: nextFollowUpDate,
            source: "pipeline",
          })
        );
      }
      if (nextFollowUpDate && nextFollowUpDate.getTime() >= now && nextFollowUpDate.getTime() <= endOfToday.getTime()) {
        followUpDueTodayCount += 1;
      }
      if (sequenceStatus === "ACTIVE") {
        tasks.push(
          toTask({
            id: `sequence-${entry.jobId}-${entry.candidateId}`,
            type: "active_sequence",
            category: "messages",
            priority: 2.3,
            candidateName,
            candidateId: entry.candidateId,
            jobId: entry.jobId,
            jobTitle: String(job?.title || "Job"),
            subtitle: "Active outreach sequence",
            href: getCandidateUrl(entry.candidateId, entry.jobId),
            source: "sequences",
          })
        );
      }
      const seqRow = sequenceByCandidate.get(String(entry.candidateId));
      if (seqRow && String(seqRow.status || "") === "ACTIVE" && isSequenceStepDue(seqRow, new Date())) {
        sequenceStepsDueCount += 1;
        tasks.push(
          toTask({
            id: `seq-due-${entry.jobId}-${entry.candidateId}`,
            type: "sequence_step_due",
            category: "followups",
            priority: 1.2,
            candidateName,
            candidateId: entry.candidateId,
            jobId: entry.jobId,
            jobTitle: String(job?.title || "Job"),
            subtitle: "Sequence reminder due — send the next message yourself",
            href: getCandidateUrl(entry.candidateId, entry.jobId),
            dueAt: seqRow?.nextStepAt,
            source: "sequences",
          })
        );
      }
      const interviewRow = interviewByCandidate.get(String(entry.candidateId));
      if (interviewRow?.scheduledAt && (stage === "INTERVIEW" || stage === "FINALIST") && !evaluationSummary.isComplete) {
        interviewNeedsEvalCount += 1;
        tasks.push(
          toTask({
            id: `interview-eval-${entry.jobId}-${entry.candidateId}`,
            type: "interview_evaluation_incomplete",
            category: "interviews",
            priority: 1.25,
            candidateName,
            candidateId: entry.candidateId,
            jobId: entry.jobId,
            jobTitle: String(job?.title || "Job"),
            interviewId: String(interviewRow?.id || ""),
            subtitle: "Interview scheduled — structured evaluation still incomplete",
            href: getCandidateUrl(entry.candidateId, entry.jobId),
            dueAt: interviewRow?.scheduledAt,
            source: "evaluations",
          })
        );
      }
      const feedbackRows = feedbackByCandidate.get(String(entry.candidateId)) || [];
      const missingFeedbackCount = feedbackRows.filter((f: any) => {
        const st = String(f?.status || "");
        return st !== "SUBMITTED" && st !== "WAIVED";
      }).length;
      const debriefRow = debriefByCandidate.get(String(entry.candidateId));
      const debriefStatus = String(debriefRow?.status || "");
      if (debriefStatus === "READY" && missingFeedbackCount === 0) {
        debriefsReadyCount += 1;
        tasks.push(
          toTask({
            id: `debrief-ready-${entry.jobId}-${entry.candidateId}`,
            type: "debrief_ready",
            category: "interviews",
            priority: 1.15,
            candidateName,
            candidateId: entry.candidateId,
            jobId: entry.jobId,
            jobTitle: String(job?.title || "Job"),
            subtitle: "Debrief ready for final decision",
            href: getCandidateUrl(entry.candidateId, entry.jobId),
            source: "debriefs",
          })
        );
      } else if (debriefStatus && missingFeedbackCount > 0) {
        debriefsBlockedCount += 1;
        tasks.push(
          toTask({
            id: `debrief-blocked-${entry.jobId}-${entry.candidateId}`,
            type: "debrief_blocked_missing_feedback",
            category: "interviews",
            priority: 1.18,
            candidateName,
            candidateId: entry.candidateId,
            jobId: entry.jobId,
            jobTitle: String(job?.title || "Job"),
            subtitle: `Debrief blocked: missing feedback (${missingFeedbackCount})`,
            href: getCandidateUrl(entry.candidateId, entry.jobId),
            source: "debriefs",
          })
        );
      }
    }

    const offersRes = await fetch(`/api/job/${job.id}/offers?status=DRAFT,PENDING_APPROVAL,APPROVED,SENT,ACCEPTED&limit=120`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const offersJson = await offersRes.json().catch(() => ({}));
    const jobOffers = offersRes.ok && Array.isArray(offersJson.offers) ? offersJson.offers : [];
    const jobOpen = String(job.status || "ACTIVE").toUpperCase() === "ACTIVE";
    for (const off of jobOffers as any[]) {
      const st = String(off.status || "").toUpperCase();
      const offerId = String(off.id || "");
      const cid = String(off.candidateId || "");
      if (!cid || !offerId) continue;
      const cname = await resolveCandidateName(cid);
      const profileHref = getCandidateUrl(cid, job.id);
      let offerTask: WorkQueueTask | null = null;
      if (st === "PENDING_APPROVAL") {
        offersPendingApprovalCount += 1;
        offerTask = toTask({
          id: `offer-appr-${offerId}`,
          type: "offer_pending_approval",
          category: "offers",
          priority: 1.2,
          candidateName: cname,
          candidateId: cid,
          jobId: job.id,
          jobTitle: String(job?.title || "Job"),
          offerId,
          subtitle: "Offer pending approval",
          href: profileHref,
          source: "offers",
        });
      } else if (st === "APPROVED") {
        offersReadyToSendCount += 1;
        offerTask = toTask({
          id: `offer-send-${offerId}`,
          type: "offer_approved_send",
          category: "offers",
          priority: 1.3,
          candidateName: cname,
          candidateId: cid,
          jobId: job.id,
          jobTitle: String(job?.title || "Job"),
          offerId,
          subtitle: "Offer approved — send to candidate",
          href: profileHref,
          source: "offers",
        });
      } else if (st === "DRAFT" && !off.approvalRequired) {
        offersReadyToSendCount += 1;
        offerTask = toTask({
          id: `offer-draft-${offerId}`,
          type: "offer_draft_finalize_send",
          category: "offers",
          priority: 1.35,
          candidateName: cname,
          candidateId: cid,
          jobId: job.id,
          jobTitle: String(job?.title || "Job"),
          offerId,
          subtitle: "Offer draft — finalize and send",
          href: profileHref,
          source: "offers",
        });
      } else if (st === "SENT") {
        offersAwaitingResponseCount += 1;
        offerTask = toTask({
          id: `offer-sent-${offerId}`,
          type: "offer_sent_awaiting_response",
          category: "offers",
          priority: 1.4,
          candidateName: cname,
          candidateId: cid,
          jobId: job.id,
          jobTitle: String(job?.title || "Job"),
          offerId,
          subtitle: "Offer sent — awaiting candidate response",
          href: profileHref,
          source: "offers",
        });
      } else if (st === "ACCEPTED" && jobOpen) {
        offersAcceptedNeedCloseCount += 1;
        offerTask = toTask({
          id: `offer-accepted-${offerId}`,
          type: "offer_accepted_confirm_close",
          category: "offers",
          priority: 1.5,
          candidateName: cname,
          candidateId: cid,
          jobId: job.id,
          jobTitle: String(job?.title || "Job"),
          offerId,
          subtitle: "Offer accepted — confirm job status / close if filled",
          href: getJobOverviewUrl(job.id),
          source: "offers",
        });
      }
      if (offerTask) {
        const prevPriority = seenOfferQueue.get(offerId);
        if (prevPriority === undefined || offerTask.priority < prevPriority) {
          seenOfferQueue.set(offerId, offerTask.priority);
          const idx = tasks.findIndex((q) => q.offerId === offerId);
          if (idx >= 0) tasks.splice(idx, 1);
          tasks.push(offerTask);
        }
      }
    }

    const { data: matches } = await queryDocuments("jobMatches", [where("jobId", "==", job.id)]);
    const strongUnactedMatches = ((matches || []) as any[])
      .filter((m: any) => typeof m.overallScore === "number" && m.overallScore >= 80)
      .sort((a: any, b: any) => Number(b.overallScore || 0) - Number(a.overallScore || 0))
      .slice(0, 4);
    for (const match of strongUnactedMatches as any[]) {
      if (!match.candidateId || pipelineCandidates.has(match.candidateId)) continue;
      const dedupeKey = `${job.id}:${match.candidateId}`;
      if (seenJobCandidate.has(dedupeKey)) continue;
      seenJobCandidate.add(dedupeKey);
      const candidateName = await resolveCandidateName(match.candidateId);
      newMatchesCount += 1;
      tasks.push(
        toTask({
          id: `new-${job.id}-${match.candidateId}`,
          type: "new_match_to_review",
          category: "sourcing",
          priority: 3,
          candidateName,
          candidateId: match.candidateId,
          jobId: job.id,
          jobTitle: String(job?.title || "Job"),
          subtitle: "New match to review",
          href: getJobMatchesUrl(job.id),
          source: "matches",
        })
      );
    }
  }

  tasks.sort(compareTasks);

  const categoryCounts = {
    urgent: 0,
    interviews: 0,
    offers: 0,
    messages: 0,
    reviews: 0,
    followups: 0,
    sourcing: 0,
    other: 0,
  };
  for (const task of tasks) {
    if (task.priority <= 1.2) categoryCounts.urgent += 1;
    categoryCounts[task.category] += 1;
  }

  return {
    tasks,
    upcomingInterviews: upcomingRows,
    counts: {
      total: tasks.length,
      urgent: categoryCounts.urgent,
      interviews: categoryCounts.interviews,
      offers: categoryCounts.offers,
      messages: categoryCounts.messages,
      reviews: categoryCounts.reviews,
      followups: categoryCounts.followups,
      sourcing: categoryCounts.sourcing,
      other: categoryCounts.other,
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
      offersPendingApproval: offersPendingApprovalCount,
      offersReadyToSend: offersReadyToSendCount,
      offersAwaitingResponse: offersAwaitingResponseCount,
      offersAcceptedNeedClose: offersAcceptedNeedCloseCount,
      scorecardsDue: scorecardsDueCount,
      debriefsBlocked: debriefsBlockedCount,
      debriefsReady: debriefsReadyCount,
      interviewsNeedingFollowUp:
        scorecardsDueCount + interviewNeedsEvalCount + debriefsBlockedCount + debriefsReadyCount + interviewsSoonCount,
    },
  };
}
