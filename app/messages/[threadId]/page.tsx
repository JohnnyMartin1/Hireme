"use client";

import { useParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { User, MessageSquare, Send, ArrowLeft, Loader2, Star } from "lucide-react";
import {
  getMessageThread,
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
  deleteMessageTemplate,
  fetchJobInterviews,
  fetchJobSequences,
  fetchMessageTemplates,
  patchJobInterview,
  patchJobSequence,
  patchMessageTemplate,
  upsertJobInterview,
  upsertJobSequence,
  upsertMessageTemplate,
} from '@/lib/communication-client';
import {
  addDays,
  formatTemplatePreview,
  getSuggestedTemplateType,
  describeSequenceAssistantState,
  SEQUENCE_ASSISTANT_MODE_LABEL,
  type InterviewEvent,
  type MessageTemplate,
  type OutreachSequence,
} from '@/lib/communication-workflow';
import { getCommunicationOperationalChips } from "@/lib/communication-status";
import Link from 'next/link';
import {
  getDashboardUrl,
  getEmployerTemplatesUrl,
  getJobMatchesUrl,
  getJobOverviewUrl,
  getJobPipelineUrl,
  getMessagesUrl,
} from '@/lib/navigation';
import CompanyRatingModal from '@/components/CompanyRatingModal';
import CompanyProfile from '@/components/CompanyProfile';

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
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [sequence, setSequence] = useState<OutreachSequence | null>(null);
  const [sequenceBusy, setSequenceBusy] = useState(false);
  const [interviewEvent, setInterviewEvent] = useState<InterviewEvent | null>(null);
  const [interviewBusy, setInterviewBusy] = useState(false);
  const [interviewScheduledAt, setInterviewScheduledAt] = useState('');
  const [interviewDuration, setInterviewDuration] = useState('30');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [showFollowUpSuggestion, setShowFollowUpSuggestion] = useState(false);
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
        // Fetch thread, participant, and messages in parallel
        const [threadResult, messagesResult] = await Promise.all([
          getMessageThread(params.threadId as string),
          getThreadMessages(params.threadId as string)
        ]);
        
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
        return;
      }
      const [sequenceRes, interviewRes] = await Promise.all([
        fetchJobSequences(jobContext.jobId, token, candidateIdForPipeline),
        fetchJobInterviews(jobContext.jobId, token, candidateIdForPipeline),
      ]);
      if (sequenceRes.ok) {
        const first = (sequenceRes.data.sequences || [])[0] as OutreachSequence | undefined;
        setSequence(first || null);
      }
      if (interviewRes.ok) {
        const first = (interviewRes.data.interviews || [])
          .find((iv: any) => String(iv?.status || "") !== "CANCELLED") as InterviewEvent | undefined;
        setInterviewEvent(first || null);
        if (first?.scheduledAt) {
          const d = first.scheduledAt as any;
          const date = d?.toDate ? d.toDate() : new Date(d);
          if (!Number.isNaN(date.getTime())) setInterviewScheduledAt(date.toISOString().slice(0, 16));
        }
        if (first?.durationMinutes) setInterviewDuration(String(first.durationMinutes));
        if (first?.location) setInterviewLocation(String(first.location));
        if (first?.notes) setInterviewNotes(String(first.notes));
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
      
      // Refresh messages to get the real message from Firebase
      setTimeout(async () => {
        const [threadRes, messagesRes] = await Promise.all([
          getMessageThread(thread.id),
          getThreadMessages(thread.id),
        ]);
        if (threadRes.data) {
          setThread(threadRes.data as Thread);
        }
        if (messagesRes.data && !messagesRes.error) {
          const typedMessages = messagesRes.data as Message[];
          setMessages(typedMessages);
          const fromThread = threadDataToJobDetails(threadRes.data as unknown as Record<string, unknown>);
          const fromMsg = typedMessages.find((msg) => msg.jobDetails?.jobId)?.jobDetails || null;
          const merged = fromThread?.jobId ? fromThread : fromMsg;
          setJobContext(merged);
          const candidateId = thread.participantIds.find((id) => id !== user.uid);
          if (merged?.jobId && candidateId && (profile?.role === "EMPLOYER" || profile?.role === "RECRUITER")) {
            const { data: entry } = await getPipelineEntryForJobCandidate(merged.jobId, candidateId);
            setPipelineEntry(entry || null);
          }
        }
      }, 500);
      
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
        setError(res.error || 'Failed to set follow-up date');
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

  const handleSaveTemplate = async () => {
    if (!user || !newMessage.trim() || !templateName.trim()) return;
    setTemplateSaving(true);
    try {
      const token = await user.getIdToken();
      const stage = jobContext?.jobId ? currentStage : null;
      const payload = selectedTemplate
        ? {
            id: selectedTemplate.id,
            name: templateName.trim(),
            body: newMessage.trim(),
            type: selectedTemplate.type,
            stage,
          }
        : {
            name: templateName.trim(),
            body: newMessage.trim(),
            type: getSuggestedTemplateType(currentStage),
            stage,
          };
      const res = selectedTemplate
        ? await patchMessageTemplate(token, payload)
        : await upsertMessageTemplate(token, payload);
      if (!res.ok) return;
      const refreshed = await fetchMessageTemplates(token);
      if (refreshed.ok) {
        setTemplates((refreshed.data.templates || []) as MessageTemplate[]);
      }
      setTemplateName('');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!user || !selectedTemplateId) return;
    setTemplateSaving(true);
    try {
      const token = await user.getIdToken();
      await deleteMessageTemplate(token, selectedTemplateId);
      const refreshed = await fetchMessageTemplates(token);
      if (refreshed.ok) {
        setTemplates((refreshed.data.templates || []) as MessageTemplate[]);
      }
      setSelectedTemplateId('');
    } finally {
      setTemplateSaving(false);
    }
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
      if (!res.ok) return;
      setSequence((res.data.sequence || null) as OutreachSequence | null);
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
      if (!res.ok) return;
      setSequence((res.data.sequence || null) as OutreachSequence | null);
    } finally {
      setSequenceBusy(false);
    }
  };

  const upsertInterview = async (status: "PROPOSED" | "CONFIRMED" | "CANCELLED") => {
    if (!user || !jobContext?.jobId || !candidateIdForPipeline) return;
    setInterviewBusy(true);
    try {
      const token = await user.getIdToken();
      let res;
      if (status === "CANCELLED") {
        res = await patchJobInterview(jobContext.jobId, token, {
          candidateId: candidateIdForPipeline,
          status,
        });
      } else {
        const scheduled = interviewScheduledAt ? new Date(interviewScheduledAt) : null;
        if (!scheduled || Number.isNaN(scheduled.getTime())) return;
        res = await upsertJobInterview(jobContext.jobId, token, {
          candidateId: candidateIdForPipeline,
          status,
          scheduledAt: scheduled.toISOString(),
          durationMinutes: Number(interviewDuration || 30),
          location: interviewLocation,
          notes: interviewNotes,
        });
      }
      if (!res.ok) return;
      setInterviewEvent((res.data.interview || null) as InterviewEvent | null);
      if (status !== "CANCELLED") {
        await postJobPipeline(
          jobContext.jobId,
          { candidateId: candidateIdForPipeline, stage: "INTERVIEW" },
          token
        );
        setPipelineEntry((prev: any) => ({ ...(prev || {}), stage: "INTERVIEW" }));
      }
    } finally {
      setInterviewBusy(false);
    }
  };

  const handleInsertInterviewDetails = () => {
    if (!interviewScheduledAt) return;
    const when = new Date(interviewScheduledAt);
    const text = [
      "Interview details:",
      `- Time: ${when.toLocaleString()}`,
      `- Duration: ${interviewDuration || "30"} minutes`,
      `- Location: ${interviewLocation || "TBD"}`,
      interviewNotes ? `- Notes: ${interviewNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    setNewMessage((prev) => `${prev.trim()}\n\n${text}`.trim());
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
            {jobIdForNav && isRecruiterView ? "Back to job messages" : "Back to messages"}
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
                {jobIdForNav && isRecruiterView ? "Back to job messages" : "Back to messages"}
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
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 w-full">
        <section className="mb-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Conversation workspace</p>
          <h1 className="text-lg sm:text-xl font-bold text-navy-900">
            {otherParticipant
              ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || 'Conversation'
              : 'Conversation'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Keep messaging, stage management, and job context together in one thread.
          </p>
        </section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
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
              {isRecruiterView && jobContext?.jobId && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                      {jobContext.jobTitle || 'Job context'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                      {currentStage}
                    </span>
                    {threadOperationalLabels.map((label) => (
                      <span
                        key={label}
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          label === 'Overdue'
                            ? 'bg-rose-100 text-rose-700'
                            : label === 'Follow-up due'
                              ? 'bg-amber-100 text-amber-700'
                              : label === 'Interview scheduled'
                                ? 'bg-indigo-100 text-indigo-700'
                                : label === 'Sequence active'
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3 text-xs font-semibold">
                    <Link
                      href={getJobMatchesUrl(jobContext.jobId)}
                      className="text-sky-700 hover:text-sky-900 underline underline-offset-2"
                    >
                      View matches
                    </Link>
                    <span className="text-slate-300" aria-hidden>
                      ·
                    </span>
                    <Link
                      href={getJobPipelineUrl(jobContext.jobId)}
                      className="text-sky-700 hover:text-sky-900 underline underline-offset-2"
                    >
                      View pipeline
                    </Link>
                    <span className="text-slate-300" aria-hidden>
                      ·
                    </span>
                    <Link
                      href={getJobOverviewUrl(jobContext.jobId)}
                      className="text-sky-700 hover:text-sky-900 underline underline-offset-2"
                    >
                      View job
                    </Link>
                    <span className="text-slate-300" aria-hidden>
                      ·
                    </span>
                    <Link
                      href={getDashboardUrl()}
                      className="text-slate-600 hover:text-navy-900 underline underline-offset-2"
                    >
                      Dashboard
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={currentStage}
                      onChange={(e) => handleMoveStage(e.target.value as PipelineStage)}
                      disabled={pipelineBusy}
                      className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                    >
                      {PIPELINE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={nextFollowUpDate ? nextFollowUpDate.toISOString().slice(0, 10) : ''}
                      onChange={(e) => handleSetFollowUp(e.target.value)}
                      disabled={pipelineBusy}
                      className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleSetFollowUp('')}
                      disabled={pipelineBusy}
                      className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Mark follow-up done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetFollowUpDays(2)}
                      disabled={pipelineBusy}
                      className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Follow up in 2 days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetFollowUpDays(5)}
                      disabled={pipelineBusy}
                      className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Follow up in 5 days
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="rounded-md border border-violet-200 bg-violet-50 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-violet-700 font-semibold">
                        Outreach sequence · {SEQUENCE_ASSISTANT_MODE_LABEL}
                      </p>
                      <p className="text-[11px] text-violet-900/80 mt-1 leading-snug">
                        {describeSequenceAssistantState(sequence)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleStartSequence}
                          disabled={sequenceBusy}
                          className="px-2 py-1 rounded-md border border-violet-200 bg-white text-[11px] font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60"
                        >
                          Start sequence
                        </button>
                        <button
                          type="button"
                          onClick={handleStopSequence}
                          disabled={sequenceBusy || sequence?.status !== 'ACTIVE'}
                          className="px-2 py-1 rounded-md border border-violet-200 bg-white text-[11px] font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-indigo-700 font-semibold">Interview scheduling</p>
                      <div className="mt-1 grid grid-cols-1 gap-1">
                        <input
                          type="datetime-local"
                          value={interviewScheduledAt}
                          onChange={(e) => setInterviewScheduledAt(e.target.value)}
                          className="px-2 py-1 rounded border border-indigo-200 bg-white text-xs text-slate-700"
                        />
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="number"
                            min={15}
                            step={15}
                            value={interviewDuration}
                            onChange={(e) => setInterviewDuration(e.target.value)}
                            className="px-2 py-1 rounded border border-indigo-200 bg-white text-xs text-slate-700"
                            placeholder="Duration mins"
                          />
                          <input
                            value={interviewLocation}
                            onChange={(e) => setInterviewLocation(e.target.value)}
                            className="px-2 py-1 rounded border border-indigo-200 bg-white text-xs text-slate-700"
                            placeholder="Location/link"
                          />
                        </div>
                        <input
                          value={interviewNotes}
                          onChange={(e) => setInterviewNotes(e.target.value)}
                          className="px-2 py-1 rounded border border-indigo-200 bg-white text-xs text-slate-700"
                          placeholder="Interview notes"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => upsertInterview('PROPOSED')}
                          disabled={interviewBusy}
                          className="px-2 py-1 rounded-md border border-indigo-200 bg-white text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          Propose
                        </button>
                        <button
                          type="button"
                          onClick={() => upsertInterview('CONFIRMED')}
                          disabled={interviewBusy}
                          className="px-2 py-1 rounded-md border border-indigo-200 bg-white text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => upsertInterview('CANCELLED')}
                          disabled={interviewBusy || !interviewEvent}
                          className="px-2 py-1 rounded-md border border-indigo-200 bg-white text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          Cancel interview
                        </button>
                        <button
                          type="button"
                          onClick={handleInsertInterviewDetails}
                          className="px-2 py-1 rounded-md border border-indigo-200 bg-white text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100"
                        >
                          Insert details in message
                        </button>
                      </div>
                      <p className="text-[10px] text-indigo-900/70 mt-2 leading-snug">
                        Status <span className="font-semibold">Proposed</span> vs <span className="font-semibold">Confirmed</span> is for your team only.
                        Cancel marks this slot as cancelled and does not change pipeline stage automatically.
                      </p>
                    </div>
                  </div>
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
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-navy-800 to-sky-500 rounded-lg flex items-center justify-center shadow-sm">
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
                            message.senderId === user.uid ? 'text-blue-100' : 'text-slate-500'
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
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
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
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name"
                      className="px-2 py-1 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={templateSaving || !templateName.trim() || !newMessage.trim()}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      {selectedTemplate ? "Update template" : "Save as template"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTemplate}
                      disabled={templateSaving || !selectedTemplate}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      Delete template
                    </button>
                    <Link
                      href={getEmployerTemplatesUrl()}
                      className="text-xs font-semibold text-sky-700 hover:underline px-1"
                    >
                      All templates
                    </Link>
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

          {/* Company/Candidate Profile Sidebar - Show for candidates viewing employers */}
          {profile.role === 'JOB_SEEKER' && otherParticipant && (
            <div className="lg:col-span-1 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-y-auto" style={{ height: 'calc(100vh - 160px)' }}>
                <CompanyProfile employerId={otherParticipant.id || otherParticipant.uid} showDetails={true} clickable={true} />
              </div>
            </div>
          )}
        </div>
      </div>

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