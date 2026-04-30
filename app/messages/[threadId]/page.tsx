"use client";

import { useParams } from 'next/navigation';
import dynamic from "next/dynamic";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { User, MessageSquare, Send, ArrowLeft, Loader2, Star } from "lucide-react";
import {
  getMessageThread,
  getUserMessageThreads,
  getThreadMessages,
  sendMessage,
  getDocument,
  createCompanyRating,
  getPipelineEntryForJobCandidate,
  PIPELINE_STAGES,
  normalizePipelineStage,
  type PipelineStage,
  threadDataToJobDetails,
  backfillThreadJobFromMessages,
} from '@/lib/firebase-firestore';
import { postJobPipeline } from '@/lib/pipeline-client';
import { canonicalPipelineEntryId } from '@/lib/pipeline-canonical';
import {
  fetchJobInterviews,
  fetchJobInterviewPlan,
  fetchInterviewFeedback,
  fetchJobSequences,
  fetchMessageTemplates,
  patchJobInterviewById,
  patchJobSequence,
  upsertJobSequence,
} from '@/lib/communication-client';
import {
  addDays,
  formatTemplatePreview,
  getSuggestedTemplateType,
  describeSequenceAssistantState,
  type InterviewEvent,
  type InterviewFeedback,
  type MessageTemplate,
  type OutreachSequence,
} from '@/lib/communication-workflow';
import { selectActiveInterview } from "@/lib/interviews/active-interview";
import { formatRecruiterDateTime } from "@/lib/recruiter-datetime";
import { getCommunicationOperationalChips, getRecruiterNextStep } from "@/lib/communication-status";
import Link from 'next/link';
import {
  getDashboardUrl,
  getCandidateUrl,
  getJobMatchesUrl,
  getJobCompareUrl,
  getJobOverviewUrl,
  getJobPipelineUrl,
  getMessagesUrl,
} from "@/lib/navigation";
import { fetchJobOffers, pickLatestOfferForCandidate, offerStatusLabel } from "@/lib/offers/client";
import type { CandidateOfferRecord } from "@/lib/offers/types";
import { pipelineStageLabel, recruiterBadge, recruiterChip } from "@/lib/recruiter-ui";
import CompanyRatingModal from '@/components/CompanyRatingModal';
import CompanyProfile from '@/components/CompanyProfile';
import InterviewStatusBadge from "@/components/recruiter/InterviewStatusBadge";

const ScheduleInterviewModal = dynamic(() => import("@/components/recruiter/ScheduleInterviewModal"), { ssr: false });

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  read: boolean;
  jobDetails?: {
    jobId: string;
    jobTitle: string;
    employmentType: string;
    location: string;
    jobDescription: string;
  };
}

interface Thread {
  id: string;
  participantIds: string[];
  createdAt: any;
  updatedAt: any;
  lastMessageAt: any;
  jobId?: string;
  jobContext?: Record<string, unknown>;
}

interface ThreadListItem {
  id: string;
  candidateId: string | null;
  candidateName: string;
  candidateHeadline: string;
  jobId?: string | null;
  jobTitle?: string;
  lastPreview: string;
  lastMessageAt?: any;
}

export default function MessageThreadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [jobToRate, setJobToRate] = useState<any>(null);
  const [jobContext, setJobContext] = useState<Message['jobDetails'] | null>(null);
  const [pipelineEntry, setPipelineEntry] = useState<any>(null);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sequence, setSequence] = useState<OutreachSequence | null>(null);
  const [sequenceBusy, setSequenceBusy] = useState(false);
  const [interviewEvent, setInterviewEvent] = useState<InterviewEvent | null>(null);
  const [interviewBusy, setInterviewBusy] = useState(false);
  const [interviewSelectionAmbiguous, setInterviewSelectionAmbiguous] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState<InterviewFeedback[]>([]);
  const [roundNamesById, setRoundNamesById] = useState<Record<string, string>>({});
  const [showScheduleInterviewModal, setShowScheduleInterviewModal] = useState(false);
  const [scheduleDefaultStatus, setScheduleDefaultStatus] = useState<"PROPOSED" | "SCHEDULED" | "CONFIRMED">("SCHEDULED");
  const [showFollowUpSuggestion, setShowFollowUpSuggestion] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [threadList, setThreadList] = useState<ThreadListItem[]>([]);
  const [threadListLoading, setThreadListLoading] = useState(false);
  const [latestJobOffer, setLatestJobOffer] = useState<CandidateOfferRecord | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isRecruiterView = profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER';
  const candidateIdForPipeline = thread?.participantIds?.find((id) => id !== user?.uid) || null;

  const jobIdForNav = useMemo(() => {
    return (
      searchParams.get("jobId") ||
      (thread?.jobId as string | undefined) ||
      jobContext?.jobId ||
      null
    );
  }, [searchParams, thread?.jobId, jobContext?.jobId]);

  const messagesInboxUrl = useMemo(() => {
    if (profile?.role === "JOB_SEEKER") return "/messages/candidate";
    return jobIdForNav ? getMessagesUrl(jobIdForNav) : "/messages";
  }, [profile?.role, jobIdForNav]);

  const toValidDate = (value: unknown): Date | null => {
    if (!value) return null;
    const v = value as {
      toDate?: () => Date;
      _seconds?: number;
      seconds?: number;
    };
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
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const safeDateInputValue = (value: Date | null) => {
    if (!value) return "";
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const loadThreadList = async () => {
      if (!user || !isRecruiterView) return;
      setThreadListLoading(true);
      try {
        const { data: threadsData } = await getUserMessageThreads(user.uid);
        const rows = await Promise.all(
          ((threadsData || []) as any[]).map(async (t: any) => {
            const candidateId = Array.isArray(t.participantIds)
              ? (t.participantIds as string[]).find((id) => id !== user.uid) || null
              : null;
            let candidateName = "Candidate";
            let candidateHeadline = "";
            if (candidateId) {
              const { data: c, error: candidateError } = await getDocument("users", candidateId);
              if (candidateError) {
                return {
                  id: String(t.id),
                  candidateId,
                  candidateName,
                  candidateHeadline,
                  jobId: threadDataToJobDetails(t as unknown as Record<string, unknown>)?.jobId || null,
                  jobTitle: threadDataToJobDetails(t as unknown as Record<string, unknown>)?.jobTitle || "",
                  lastPreview: String((t as any)?.lastMessagePreview || ""),
                  lastMessageAt: t.lastMessageAt || t.updatedAt || null,
                } as ThreadListItem;
              }
              if (c) {
                candidateName = `${(c as any).firstName || ""} ${(c as any).lastName || ""}`.trim() || "Candidate";
                candidateHeadline = String((c as any).headline || "");
              }
            }
            const threadJob = threadDataToJobDetails(t as unknown as Record<string, unknown>);
            const jobId = threadJob?.jobId || null;
            const jobTitle = threadJob?.jobTitle || "";
            return {
              id: String(t.id),
              candidateId,
              candidateName,
              candidateHeadline,
              jobId,
              jobTitle,
              lastPreview: String((t as any)?.lastMessagePreview || ""),
              lastMessageAt: t.lastMessageAt || t.updatedAt || null,
            } as ThreadListItem;
          })
        );
        rows.sort((a, b) => {
          const ad = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate().getTime() : (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0);
          const bd = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate().getTime() : (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0);
          return bd - ad;
        });
        setThreadList(rows);
      } finally {
        setThreadListLoading(false);
      }
    };
    loadThreadList();
  }, [user, isRecruiterView]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchThreadData = async () => {
      if (!params.threadId || !user) return;

      setIsLoading(true);
      try {
        // First verify thread access; load messages only for authorized thread.
        const threadResult = await getMessageThread(params.threadId as string);
        
        if (threadResult.error) {
          setError(`Thread not found: ${threadResult.error}`);
          return;
        }
        
        if (!threadResult.data) {
          setError('Thread not found - no data returned');
          return;
        }
        
        setThread(threadResult.data as Thread);

        // Get the other participant's profile
        const otherId = (threadResult.data as Thread).participantIds.find((id: string) => id !== user.uid);
        
        if (otherId) {
          const { data: otherProfile } = await getDocument('users', otherId);
          if (otherProfile) {
            setOtherParticipant(otherProfile);
          }
        }

        // Set messages
        const messagesResult = await getThreadMessages(params.threadId as string);
        if (messagesResult.error) {
          setError(`Failed to load messages: ${messagesResult.error}`);
          return;
        }

        setMessages((messagesResult.data as Message[]) || []);
        const loadedMessages = (messagesResult.data as Message[]) || [];
        const urlJobId =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("jobId")
            : null;

        let effectiveJob = threadDataToJobDetails(threadResult.data as unknown as Record<string, unknown>);
        if (!effectiveJob?.jobId) {
          effectiveJob = loadedMessages.find((msg) => msg.jobDetails?.jobId)?.jobDetails || null;
        }
        if (
          !effectiveJob?.jobId &&
          urlJobId &&
          (profile?.role === "EMPLOYER" || profile?.role === "RECRUITER")
        ) {
          const { data: jobRow } = await getDocument("jobs", urlJobId);
          if (jobRow) {
            const j = jobRow as any;
            effectiveJob = {
              jobId: urlJobId,
              jobTitle: j.title || "",
              employmentType: j.employment || "",
              location: `${j.locationCity || ""} ${j.locationState || ""}`.trim() || j.location || "",
              jobDescription: j.description || "",
            };
          }
        }
        if (
          !effectiveJob?.jobId &&
          loadedMessages.some((m) => m.jobDetails?.jobId) &&
          (profile?.role === "EMPLOYER" || profile?.role === "RECRUITER")
        ) {
          await backfillThreadJobFromMessages(params.threadId as string);
          const refreshedThread = await getMessageThread(params.threadId as string);
          if (refreshedThread.data) {
            setThread(refreshedThread.data as Thread);
            effectiveJob =
              threadDataToJobDetails(refreshedThread.data as unknown as Record<string, unknown>) ||
              loadedMessages.find((msg) => msg.jobDetails?.jobId)?.jobDetails ||
              null;
          }
        }
        setJobContext(effectiveJob);

        if (effectiveJob?.jobId && otherId && (profile?.role === "EMPLOYER" || profile?.role === "RECRUITER")) {
          const { data: entry } = await getPipelineEntryForJobCandidate(effectiveJob.jobId, otherId);
          setPipelineEntry(entry || null);
        } else {
          setPipelineEntry(null);
        }

      } catch (err) {
        setError(`Failed to load thread: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreadData();
  }, [params.threadId, user, profile?.role]);

  useEffect(() => {
    const loadOperationalData = async () => {
      if (!user || !isRecruiterView) return;
      const token = await user.getIdToken();
      const templatesRes = await fetchMessageTemplates(token);
      if (templatesRes.ok) {
        setTemplates((templatesRes.data.templates || []) as MessageTemplate[]);
      }
      if (!jobContext?.jobId || !candidateIdForPipeline) {
        setSequence(null);
        setInterviewEvent(null);
        setInterviewSelectionAmbiguous(false);
        setRoundNamesById({});
        setLatestJobOffer(null);
        return;
      }
      const [sequenceRes, interviewRes, feedbackRes, planRes] = await Promise.all([
        fetchJobSequences(jobContext.jobId, token, candidateIdForPipeline),
        fetchJobInterviews(jobContext.jobId, token, candidateIdForPipeline),
        fetchInterviewFeedback(jobContext.jobId, token, { candidateId: candidateIdForPipeline }),
        fetchJobInterviewPlan(jobContext.jobId, token),
      ]);
      const nextRoundNames: Record<string, string> = {};
      if (planRes.ok) {
        for (const round of planRes.data.rounds || []) {
          const id = String((round as any)?.id || "").trim();
          const name = String((round as any)?.roundName || "").trim();
          if (id && name) nextRoundNames[id] = name;
        }
      }
      setRoundNamesById(nextRoundNames);
      if (sequenceRes.ok) {
        const first = (sequenceRes.data.sequences || [])[0] as OutreachSequence | undefined;
        setSequence(first || null);
      }
      if (interviewRes.ok) {
        const selected = selectActiveInterview((interviewRes.data.interviews || []) as any[]);
        const first = selected.interview as InterviewEvent | null;
        setInterviewSelectionAmbiguous(selected.ambiguous);
        setInterviewEvent(first || null);
        if (selected.ambiguous) {
          setWorkflowNotice({
            type: "error",
            text: "Multiple active interviews found. Open candidate profile to manage a specific interview.",
          });
        }
      }
      if (feedbackRes.ok) {
        setInterviewFeedback((feedbackRes.data.feedback || []) as InterviewFeedback[]);
      }
      const offersRes = await fetchJobOffers(jobContext.jobId, token, candidateIdForPipeline);
      if (offersRes.ok) {
        setLatestJobOffer(pickLatestOfferForCandidate(offersRes.data.offers, candidateIdForPipeline));
      } else {
        setLatestJobOffer(null);
      }
    };
    loadOperationalData();
  }, [user, isRecruiterView, jobContext?.jobId, candidateIdForPipeline]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !thread || !user || !profile) return;

    setIsSending(true);
    try {
      const messageData: {
        senderId: string;
        senderName: string;
        content: string;
        jobDetails?: Message["jobDetails"];
      } = {
        senderId: user.uid,
        senderName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User',
        content: newMessage.trim(),
      };
      if (jobContext?.jobId) {
        messageData.jobDetails = {
          jobId: jobContext.jobId,
          jobTitle: jobContext.jobTitle || '',
          employmentType: jobContext.employmentType || '',
          location: jobContext.location || '',
          jobDescription: jobContext.jobDescription || '',
        };
      }

      const token = await user.getIdToken();
      const { error: messageError } = await sendMessage(thread.id, messageData, token);
      
      if (messageError) {
        console.error('Error sending message:', messageError);
        setError(typeof messageError === 'string' ? messageError : 'Failed to send message');
        return;
      }

      // Add message to local state
      const newMsg: Message = {
        id: Date.now().toString(), // Temporary ID
        content: newMessage.trim(),
        senderId: user.uid,
        senderName: messageData.senderName,
        createdAt: new Date(),
        read: false
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      if (isRecruiterView && jobContext?.jobId && candidateIdForPipeline) {
        setShowFollowUpSuggestion(true);
      }
      
      setThread((prev) =>
        prev
          ? {
              ...prev,
              lastMessageAt: new Date(),
            }
          : prev
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRateCompany = (message: Message) => {
    if (message.jobDetails && otherParticipant) {
      setJobToRate({
        jobId: message.jobDetails.jobId,
        jobTitle: message.jobDetails.jobTitle,
        companyName: otherParticipant.companyName || otherParticipant.firstName + ' ' + otherParticipant.lastName
      });
      setShowRatingModal(true);
    }
  };

  const handleSubmitRating = async (rating: number, message: string) => {
    if (!user || !profile || !jobToRate) return;

    setIsSubmittingRating(true);
    try {
      const ratingData = {
        candidateId: user.uid,
        employerId: otherParticipant?.id || otherParticipant?.uid,
        companyName: jobToRate.companyName,
        jobId: jobToRate.jobId,
        jobTitle: jobToRate.jobTitle,
        rating,
        message: message.trim() || undefined
      };

      const { error: ratingError } = await createCompanyRating(ratingData);

      if (ratingError) {
        console.error('Error submitting rating:', ratingError);
        setError('Failed to submit rating. Please try again.');
        return;
      }

      setShowRatingModal(false);
      setJobToRate(null);
      // You could show a success message here
      
    } catch (err) {
      console.error('Error in handleSubmitRating:', err);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const currentStage = normalizePipelineStage(pipelineEntry?.stage);

  const suggestedTemplate = useMemo(() => {
    const wantedType = getSuggestedTemplateType(currentStage);
    return templates.find(
      (template) =>
        template.type === wantedType &&
        (!template.stage || normalizePipelineStage(template.stage) === currentStage)
    ) || templates.find((template) => template.type === wantedType) || null;
  }, [templates, currentStage]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const handleMoveStage = async (newStage: PipelineStage) => {
    if (!jobContext?.jobId || !candidateIdForPipeline) return;
    if (!user?.uid) return;
    setPipelineBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await postJobPipeline(
        jobContext.jobId,
        { candidateId: candidateIdForPipeline, stage: newStage },
        token
      );
      if (!res.ok) {
        setError(res.error || 'Failed to update pipeline');
        return;
      }
      const canonicalId = canonicalPipelineEntryId(jobContext.jobId, candidateIdForPipeline);
      setPipelineEntry((prev: any) => ({
        ...(prev || {}),
        id: canonicalId,
        stage: newStage,
        ...(res.entry || {}),
      }));
    } finally {
      setPipelineBusy(false);
    }
  };

  const handleSetFollowUp = async (rawDate: string) => {
    if (!jobContext?.jobId || !candidateIdForPipeline) return;
    if (!user?.uid) return;
    const followUpDate = rawDate ? new Date(`${rawDate}T12:00:00`) : null;
    setPipelineBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await postJobPipeline(
        jobContext.jobId,
        {
          candidateId: candidateIdForPipeline,
          nextFollowUpAt: followUpDate ? followUpDate.toISOString() : null,
        },
        token
      );
      if (!res.ok) {
        setWorkflowNotice({ type: "error", text: res.error || "Failed to set follow-up date." });
        return;
      }
      const canonicalId = canonicalPipelineEntryId(jobContext.jobId, candidateIdForPipeline);
      setPipelineEntry((prev: any) => ({
        ...(prev || {}),
        id: canonicalId,
        stage: normalizePipelineStage((res.entry as any)?.stage || prev?.stage || 'NEW'),
        nextFollowUpAt: followUpDate,
        ...(res.entry || {}),
      }));
      setWorkflowNotice({
        type: "success",
        text: rawDate ? "Follow-up date updated." : "Follow-up marked done.",
      });
    } finally {
      setPipelineBusy(false);
    }
  };

  const handleSetFollowUpDays = async (days: number) => {
    const target = addDays(new Date(), days);
    await handleSetFollowUp(target.toISOString().slice(0, 10));
  };

  const handleApplyTemplate = (template: MessageTemplate) => {
    setNewMessage((prev) => {
      const prefix = prev.trim().length > 0 ? `${prev.trim()}\n\n` : "";
      return `${prefix}${template.body}`.trim();
    });
  };

  const handleStartSequence = async () => {
    if (!user || !jobContext?.jobId || !candidateIdForPipeline) return;
    setSequenceBusy(true);
    try {
      const token = await user.getIdToken();
      const stepTemplateId = selectedTemplateId || suggestedTemplate?.id || null;
      const res = await upsertJobSequence(jobContext.jobId, token, {
        candidateId: candidateIdForPipeline,
        steps: [
          {
            delayDays: 0,
            messageTemplateId: stepTemplateId,
            body: stepTemplateId ? null : (newMessage.trim() || null),
          },
          {
            delayDays: 3,
            messageTemplateId: stepTemplateId,
            body: null,
          },
        ],
      });
      if (!res.ok) {
        setWorkflowNotice({ type: "error", text: res.error || "Failed to start sequence." });
        return;
      }
      setSequence((res.data.sequence || null) as OutreachSequence | null);
      setWorkflowNotice({ type: "success", text: "Sequence started." });
    } finally {
      setSequenceBusy(false);
    }
  };

  const handleStopSequence = async () => {
    if (!user || !jobContext?.jobId || !candidateIdForPipeline) return;
    setSequenceBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await patchJobSequence(jobContext.jobId, token, {
        candidateId: candidateIdForPipeline,
        status: "STOPPED",
        stoppedReason: "MANUAL_STOP",
      });
      if (!res.ok) {
        setWorkflowNotice({ type: "error", text: res.error || "Failed to stop sequence." });
        return;
      }
      setSequence((res.data.sequence || null) as OutreachSequence | null);
      setWorkflowNotice({ type: "success", text: "Sequence stopped." });
    } finally {
      setSequenceBusy(false);
    }
  };

  const handlePatchInterview = async (body: Record<string, unknown>, successText: string) => {
    if (!user || !jobContext?.jobId || !interviewEvent?.id) return;
    setInterviewBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await patchJobInterviewById(jobContext.jobId, interviewEvent.id, token, body);
      if (!res.ok) {
        setWorkflowNotice({ type: "error", text: res.error || "Failed to update interview." });
        return;
      }
      setInterviewEvent((res.data.interview || null) as InterviewEvent | null);
      setWorkflowNotice({ type: "success", text: successText });
    } finally {
      setInterviewBusy(false);
    }
  };

  const handleCopyInterviewDetails = () => {
    if (!interviewEvent) return;
    const locationRaw = interviewEvent.location as any;
    const locationValue =
      typeof locationRaw === "string" ? locationRaw : String(locationRaw?.value || locationRaw?.location || "TBD");
    const text = [
      "Interview details:",
      `- Time: ${formatRecruiterDateTime(interviewEvent.scheduledAt, { placeholder: "Interview date not set" })}`,
      `- Duration: ${interviewEvent.durationMinutes || 30} minutes`,
      `- Location: ${locationValue || "TBD"}`,
      interviewEvent.notes ? `- Notes: ${interviewEvent.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    setNewMessage((prev) => `${prev.trim()}\n\n${text}`.trim());
    navigator.clipboard?.writeText(text).catch(() => {});
    setWorkflowNotice({ type: "success", text: "Interview details copied and added to draft." });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading conversation...</p>
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
          <Link 
            href={messagesInboxUrl} 
            className="text-sky-600 hover:text-navy-800 underline"
          >
            {jobIdForNav && isRecruiterView ? "Back to job inbox" : "Back to inbox"}
          </Link>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Thread not found</p>
        </div>
      </div>
    );
  }

  const followUpRaw = pipelineEntry?.nextFollowUpAt;
  const nextFollowUpDate = followUpRaw
    ? new Date(followUpRaw?.toDate ? followUpRaw.toDate() : followUpRaw)
    : null;
  const followUpDue = !!nextFollowUpDate && nextFollowUpDate.getTime() < Date.now();
  const threadOperationalLabels = getCommunicationOperationalChips({
    pipelineStage: currentStage,
    hasEvaluation: false,
    isEvaluationComplete: true,
    reviewStatus: null,
    awaitingCandidateReply:
      messages.length > 0 ? messages[messages.length - 1]?.senderId === user.uid : null,
    nextFollowUpAt: nextFollowUpDate,
    interviewAt: interviewEvent?.scheduledAt || null,
    sequence: sequence || null,
  });
  const nextStepLine = getRecruiterNextStep({
    pipelineStage: currentStage,
    awaitingCandidateReply:
      messages.length > 0 ? messages[messages.length - 1]?.senderId === user.uid : null,
    nextFollowUpAt: nextFollowUpDate,
    interviewAt: interviewEvent?.scheduledAt || null,
    sequence: sequence || null,
    isEvaluationComplete: currentStage !== "INTERVIEW" ? true : false,
  });

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Link
              href={messagesInboxUrl}
              className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200 shrink-0" />
              <span className="font-medium text-sm hidden sm:inline">
                {jobIdForNav && isRecruiterView ? "Back to job inbox" : "Back to inbox"}
              </span>
              <span className="font-medium text-sm sm:hidden">Back</span>
            </Link>
            {isRecruiterView && jobIdForNav && (
              <>
                <Link
                  href={getJobPipelineUrl(jobIdForNav)}
                  className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-navy-800 hover:bg-slate-50 min-h-[44px]"
                >
                  Pipeline
                </Link>
                <Link
                  href={getJobOverviewUrl(jobIdForNav)}
                  className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-navy-800 hover:bg-slate-50 min-h-[44px]"
                >
                  Job overview
                </Link>
              </>
            )}
          </div>
          <Link
            href={
              isRecruiterView
                ? getDashboardUrl()
                : profile?.role === "JOB_SEEKER"
                  ? "/home/seeker"
                  : "/"
            }
            className="shrink-0"
            aria-label="HireMe home"
          >
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 w-full">
        <section className="mb-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Conversation workspace</p>
          <h1 className="text-2xl font-bold text-navy-900">
            {otherParticipant
              ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || 'Conversation'
              : 'Conversation'}
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-2xl">
            Messaging, stage updates, and job context stay in one place.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
          {isRecruiterView && (
            <aside className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Threads</p>
              </div>
              <div className="overflow-y-auto h-[calc(100%-44px)]">
                {threadListLoading ? (
                  <div className="p-4 text-xs text-slate-500">Loading threads...</div>
                ) : (
                  threadList.map((row) => {
                    const active = String(params.threadId || "") === row.id;
                    const rowJobId = row.jobId || jobIdForNav || "";
                    const href = rowJobId
                      ? `/messages/${row.id}?jobId=${encodeURIComponent(rowJobId)}`
                      : `/messages/${row.id}`;
                    return (
                      <Link
                        key={row.id}
                        href={href}
                        className={`block px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${active ? "bg-sky-50" : ""}`}
                      >
                        <p className="text-sm font-semibold text-navy-900 truncate">{row.candidateName}</p>
                        {row.jobTitle ? <p className="text-xs text-slate-600 truncate">{row.jobTitle}</p> : null}
                        <p className="text-xs text-slate-500 truncate mt-0.5">{row.lastPreview || "No messages yet"}</p>
                      </Link>
                    );
                  })
                )}
              </div>
            </aside>
          )}
          {/* Messages Section */}
          <div className={`${isRecruiterView ? "lg:col-span-6" : "lg:col-span-8"} bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col`} style={{ height: 'calc(100vh - 160px)' }}>
            {/* Conversation Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {otherParticipant?.profileImageUrl ? (
                    <img
                      src={otherParticipant.profileImageUrl}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-slate-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {otherParticipant 
                      ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || 'Unknown User'
                      : 'Unknown User'
                    }
                  </h2>
                  <p className="text-sm text-slate-600">
                    {otherParticipant?.headline || otherParticipant?.role || 'User'}
                  </p>
                </div>
              </div>
              {isRecruiterView && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {threadOperationalLabels.map((label) => (
                    <span key={label} className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${recruiterBadge.neutral}`}>
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4 max-w-full">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'} w-full`}>
                      <div className="max-w-xs lg:max-w-md w-full">
                        {/* Job Details Card - Show above message if present */}
                        {message.jobDetails && (
                          <Link 
                            href={getJobOverviewUrl(message.jobDetails.jobId)}
                            className="block mb-2"
                          >
                            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all cursor-pointer">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-navy-800 rounded-lg flex items-center justify-center shadow-sm">
                                  <i className="fa-solid fa-briefcase text-white text-sm"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-semibold text-navy-900 truncate">
                                      {message.jobDetails.jobTitle}
                                    </h4>
                                  </div>
                                  <div className="mt-2 space-y-1.5">
                                    <div className="flex items-center text-xs text-slate-600">
                                      <i className="fa-solid fa-clock mr-2 text-sky-500"></i>
                                      <span>{message.jobDetails.employmentType}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-slate-600">
                                      <i className="fa-solid fa-location-dot mr-2 text-sky-500"></i>
                                      <span className="truncate">{message.jobDetails.location}</span>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex items-center text-xs font-semibold text-sky-600 hover:text-navy-700 transition-colors">
                                    <span>View full job description</span>
                                    <i className="fa-solid fa-arrow-right ml-2"></i>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}
                        
                        {/* Message Content */}
                        <div className={`px-4 py-3 rounded-2xl ${
                          message.senderId === user.uid
                            ? 'bg-navy-800 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === user.uid ? "text-sky-100" : "text-slate-500"
                          }`}>
                            {message.createdAt ? new Date(message.createdAt.toDate ? message.createdAt.toDate() : message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Composer */}
            <div className="p-6 border-t border-slate-100">
              {isRecruiterView && (
                <div className="mb-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {suggestedTemplate && (
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(suggestedTemplate)}
                        className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-navy-900 hover:bg-sky-100"
                      >
                        Suggested message: {suggestedTemplate.name}
                      </button>
                    )}
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                    >
                      <option value="">Choose template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.type})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => selectedTemplate && handleApplyTemplate(selectedTemplate)}
                      disabled={!selectedTemplate}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Apply template
                    </button>
                  </div>
                  {selectedTemplate && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Template preview</p>
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">
                        {formatTemplatePreview(selectedTemplate)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {showFollowUpSuggestion && isRecruiterView && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex flex-wrap items-center gap-2">
                  Message sent. Set follow-up reminder?
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSetFollowUpDays(3);
                      setShowFollowUpSuggestion(false);
                    }}
                    className="rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold hover:bg-amber-100"
                  >
                    Set +3 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFollowUpSuggestion(false)}
                    className="rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold hover:bg-amber-100"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Send a message..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 resize-none text-navy-900 placeholder-slate-400"
                    rows={1}
                    disabled={isSending}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-navy-800 text-white px-4 py-3 rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 shadow-md"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {isRecruiterView && (
            <aside className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-y-auto" style={{ height: 'calc(100vh - 160px)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Workflow context</p>
              {workflowNotice ? (
                <div
                  className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                    workflowNotice.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {workflowNotice.text}
                </div>
              ) : null}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
                <p className="text-sm font-semibold text-navy-900">
                  {otherParticipant ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || "Candidate" : "Candidate"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{otherParticipant?.headline || "Candidate profile"}</p>
                <p className="text-xs text-navy-900 mt-1 font-medium">{nextStepLine}</p>
              </div>

              {jobContext?.jobId ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job context</p>
                    <p className="text-sm font-semibold text-navy-900 mt-1">{jobContext.jobTitle || "Job"}</p>
                  </div>

                  {candidateIdForPipeline ? (
                    latestJobOffer ? (
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Offer status</p>
                        <p className="text-sm font-semibold text-navy-900 mt-1">{offerStatusLabel(latestJobOffer.status)}</p>
                        <Link
                          href={`${getCandidateUrl(candidateIdForPipeline, jobContext.jobId)}#recruiter-offer-panel`}
                          className="mt-2 inline-block text-xs font-semibold text-sky-800 underline underline-offset-2 hover:text-navy-900"
                        >
                          Manage on candidate profile
                        </Link>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 mb-3 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Offer: </span>
                        No active offer for this job.{" "}
                        <Link
                          href={`${getCandidateUrl(candidateIdForPipeline, jobContext.jobId)}#recruiter-offer-panel`}
                          className="font-semibold text-sky-800 underline"
                        >
                          Create from profile
                        </Link>
                      </div>
                    )
                  ) : null}

                  <div className="rounded-lg border border-slate-200 bg-white p-3 mb-3 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block">Pipeline stage</label>
                    <select
                      value={currentStage}
                      onChange={(e) => handleMoveStage(e.target.value as PipelineStage)}
                      disabled={pipelineBusy}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                    >
                      {PIPELINE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {pipelineStageLabel(stage)}
                        </option>
                      ))}
                    </select>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block pt-1">Next follow-up</label>
                    <input
                      type="date"
                      value={safeDateInputValue(nextFollowUpDate)}
                      onChange={(e) => handleSetFollowUp(e.target.value)}
                      disabled={pipelineBusy}
                      className="w-full px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button type="button" onClick={() => handleSetFollowUpDays(1)} disabled={pipelineBusy} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">Tomorrow</button>
                      <button type="button" onClick={() => handleSetFollowUpDays(3)} disabled={pipelineBusy} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">In 3 days</button>
                      <button type="button" onClick={() => handleSetFollowUpDays(7)} disabled={pipelineBusy} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">Next week</button>
                      <button type="button" onClick={() => handleSetFollowUp("")} disabled={pipelineBusy} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">Clear</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 mb-3">
                    <Link href={`/candidate/${candidateIdForPipeline}?jobId=${encodeURIComponent(jobContext.jobId)}`} className="rounded-lg bg-navy-800 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-navy-700">
                      View full profile
                    </Link>
                    <Link href={getJobPipelineUrl(jobContext.jobId)} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-navy-900 hover:bg-slate-50">
                      Open pipeline
                    </Link>
                    <Link href={getJobCompareUrl(jobContext.jobId)} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-navy-900 hover:bg-slate-50">
                      Compare
                    </Link>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interview actions</p>
                      {interviewEvent ? <InterviewStatusBadge status={interviewEvent.status} /> : null}
                    </div>
                    {interviewEvent ? (
                      <div className="space-y-2 text-xs text-slate-700">
                        <p>
                          {formatRecruiterDateTime(interviewEvent.scheduledAt, { placeholder: "Interview date not set" })}
                          {interviewEvent.timezone ? ` (${interviewEvent.timezone})` : ""}
                        </p>
                        <p>
                          {String(interviewEvent.durationMinutes || 30)} min •{" "}
                          {typeof interviewEvent.location === "string"
                            ? interviewEvent.location
                            : `${String((interviewEvent.location as any)?.type || "VIDEO").replace("_", " ")}: ${String(
                                (interviewEvent.location as any)?.value || "—"
                              )}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={recruiterChip.round}>
                            {String(roundNamesById[String(interviewEvent.roundId || "")] || "").trim() ||
                              (interviewEvent.roundId ? "Interview round" : "Saved in HireMe only")}
                          </span>
                          <span className={interviewEvent.calendarSyncStatus === "SYNCED" ? recruiterChip.synced : interviewEvent.calendarSyncStatus === "FAILED" ? recruiterChip.syncFailed : recruiterChip.optional}>
                            {String(interviewEvent.calendarProvider || "").toLowerCase() === "microsoft" ? "Outlook" : "Google"}{" "}
                            {interviewEvent.calendarSyncStatus === "SYNCED" ? "synced" : interviewEvent.calendarSyncStatus === "FAILED" ? "sync failed" : "not synced"}
                          </span>
                          <span className={recruiterChip.submitted}>
                            {interviewFeedback.filter(
                              (f) => String(f.interviewEventId || "") === String(interviewEvent.id || "") && f.status === "SUBMITTED"
                            ).length}{" "}
                            feedback submitted
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Next action:{" "}
                          {interviewFeedback.filter((f) => String(f.interviewEventId || "") === String(interviewEvent.id || "") && f.status !== "SUBMITTED" && f.status !== "WAIVED").length > 0
                            ? "complete missing scorecards"
                            : "proceed to debrief decision"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No interview scheduled yet.</p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (interviewSelectionAmbiguous) {
                            setWorkflowNotice({
                              type: "error",
                              text: "Multiple active interviews found. Open candidate profile to pick the exact interview.",
                            });
                            return;
                          }
                          setScheduleDefaultStatus("SCHEDULED");
                          setShowScheduleInterviewModal(true);
                        }}
                        disabled={interviewSelectionAmbiguous}
                        className="rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
                      >
                        {interviewEvent ? "Reschedule" : "Schedule"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePatchInterview({ status: "CONFIRMED" }, "Interview confirmed.")}
                        disabled={interviewBusy || !interviewEvent}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm("Cancel this interview and external calendar event?")) return;
                          handlePatchInterview({ status: "CANCELLED" }, "Interview cancelled.");
                        }}
                        disabled={interviewBusy || !interviewEvent}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyInterviewDetails}
                        disabled={!interviewEvent}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                      >
                        Copy details
                      </button>
                    </div>
                    {interviewEvent?.calendarHtmlLink ? (
                      <a
                        href={interviewEvent.calendarHtmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-sky-700 underline"
                      >
                        Open in {String(interviewEvent.calendarProvider || "").toLowerCase() === "microsoft" ? "Outlook Calendar" : "Google Calendar"}
                      </a>
                    ) : null}
                    <Link href="/employer/feedback" className="mt-2 inline-block text-xs font-semibold text-sky-700 underline">
                      Open feedback queue
                    </Link>
                  </div>

                  <details className="rounded-lg border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Advanced actions
                    </summary>
                    <div className="mt-2 space-y-2">
                      <p className="text-[11px] text-slate-600">Follow-up sequence: {describeSequenceAssistantState(sequence)}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleStartSequence} disabled={sequenceBusy} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          Start
                        </button>
                        <button type="button" onClick={handleStopSequence} disabled={sequenceBusy || sequence?.status !== "ACTIVE"} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          Stop
                        </button>
                      </div>
                    </div>
                  </details>
                </>
              ) : (
                <p className="text-xs text-slate-500">No job context attached to this thread.</p>
              )}
            </aside>
          )}

          {/* Company/Candidate Profile Sidebar - Show for candidates viewing employers */}
          {profile.role === 'JOB_SEEKER' && otherParticipant && (
            <div className="lg:col-span-4 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-y-auto" style={{ height: 'calc(100vh - 160px)' }}>
                <CompanyProfile employerId={otherParticipant.id || otherParticipant.uid} showDetails={true} clickable={true} />
              </div>
            </div>
          )}
        </div>
      </div>

      {jobContext?.jobId && candidateIdForPipeline ? (
        <ScheduleInterviewModal
          isOpen={showScheduleInterviewModal}
          onClose={() => setShowScheduleInterviewModal(false)}
          jobId={jobContext.jobId}
          jobTitle={jobContext.jobTitle}
          candidateId={candidateIdForPipeline}
          candidateName={otherParticipant ? `${otherParticipant.firstName || ""} ${otherParticipant.lastName || ""}`.trim() : "Candidate"}
          existingInterview={interviewEvent}
          defaultStatus={scheduleDefaultStatus}
          onSaved={async (iv) => {
            setInterviewEvent(iv);
            if (!user) return;
            const token = await user.getIdToken();
            await postJobPipeline(jobContext.jobId, { candidateId: candidateIdForPipeline, stage: "INTERVIEW" }, token);
            setPipelineEntry((prev: any) => ({ ...(prev || {}), stage: "INTERVIEW" }));
          }}
        />
      ) : null}

      {/* Company Rating Modal */}
      {jobToRate && (
        <CompanyRatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setJobToRate(null);
          }}
          companyName={jobToRate.companyName}
          jobTitle={jobToRate.jobTitle}
          onSubmit={handleSubmitRating}
          isSubmitting={isSubmittingRating}
        />
      )}
    </main>
  );
}