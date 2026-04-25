"use client";
import { useParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { User, MapPin, GraduationCap, Star, MessageSquare, Heart, Loader2, ArrowLeft, Send, Video, FileText, Download, X, Code, Briefcase, Plane, Calendar, Copy, Check, Building2, UserCircle, Award, Globe, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  getDocument,
  getOrCreateThread,
  sendMessage,
  saveCandidate,
  isCandidateSaved,
  getEndorsements,
  getPipelineEntryForJobCandidate,
  PIPELINE_STAGES,
  type PipelineStage,
  type MessageJobDetailsShape,
} from '@/lib/firebase-firestore';
import Link from 'next/link';
import { trackProfileView } from '@/lib/firebase-firestore';
import { getEmployerJobs, getCompanyJobs } from '@/lib/firebase-firestore';
import {
  fetchMessageTemplates,
  fetchJobInterviews,
  fetchJobSequences,
  patchJobInterviewById,
  upsertMessageTemplate,
  patchJobSequence,
  upsertJobSequence,
} from '@/lib/communication-client';
import {
  formatTemplatePreview,
  getSuggestedTemplateType,
  SEQUENCE_ASSISTANT_MODE_LABEL,
  describeSequenceAssistantState,
  type InterviewEvent,
  type MessageTemplate,
  type OutreachSequence,
} from '@/lib/communication-workflow';
import {
  getCandidatesSearchUrl,
  getDashboardUrl,
  getEmployerTemplatesUrl,
  getJobCompareUrl,
  getJobMatchesUrl,
  getJobOverviewUrl,
  getJobPipelineUrl,
  getMessagesUrl,
} from '@/lib/navigation';
import { formatRecruiterAttentionLine } from "@/lib/communication-status";
import { calculateCompletion } from '@/components/ProfileCompletionProvider';
import { LanguageSkill } from '@/components/LanguageSelector';
import RecruiterNotesPanel from '@/components/recruiter/RecruiterNotesPanel';
import RecruiterDecisionPanel from '@/components/recruiter/RecruiterDecisionPanel';
import CandidateTalentPoolsSection from '@/components/employer/CandidateTalentPoolsSection';
import AddToTalentPoolButton from '@/components/employer/AddToTalentPoolButton';
import SendCandidateForReviewButton from '@/components/recruiter/SendCandidateForReviewButton';
import ReviewAssignmentPanel from '@/components/recruiter/ReviewAssignmentPanel';
import InternalCommentsPanel from '@/components/recruiter/InternalCommentsPanel';
import InterviewCard from '@/components/recruiter/InterviewCard';
import ScheduleInterviewModal from '@/components/recruiter/ScheduleInterviewModal';
import { useToast } from '@/components/NotificationSystem';
import { pipelineStageLabel, recruiterBadge, recruiterBtnPrimaryLg, recruiterBtnSecondary } from "@/lib/recruiter-ui";

interface CandidateProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  school?: string;
  major?: string;
  minor?: string;
  skills?: string[];
  location?: string;
  bio?: string;
  graduationYear?: string;
  gpa?: string;
  workPreferences?: string[];
  jobTypes?: string[];
  extracurriculars?: string[];
  experience?: string;
  certifications?: string[] | Array<{name: string; verificationLink?: string; verificationCode?: string}>;
  languages?: string[] | LanguageSkill[];
  careerInterests?: string[];
  workAuthorization?: {
    authorizedToWork: boolean | null;
    requiresVisaSponsorship: boolean | null;
  };
  linkedinUrl?: string;
  portfolioUrl?: string;
  locations?: string[];
  email: string;
  createdAt?: any;
  profileImageUrl?: string;
  resumeUrl?: string;
  videoUrl?: string;
  education?: Array<{
    school: string;
    degree: string;
    majors: string[];
    minors: string[];
    graduationYear: string;
    gpa: string;
  }>;
  [key: string]: any;
}

export default function CandidateProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useFirebaseAuth();
  const toast = useToast();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [employerJobs, setEmployerJobs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [sequence, setSequence] = useState<OutreachSequence | null>(null);
  const [sequenceBusy, setSequenceBusy] = useState(false);
  const [interviewBusy, setInterviewBusy] = useState(false);
  const [interviewEvent, setInterviewEvent] = useState<InterviewEvent | null>(null);
  const [interviewEvents, setInterviewEvents] = useState<InterviewEvent[]>([]);
  const [showScheduleInterviewModal, setShowScheduleInterviewModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<InterviewEvent | null>(null);
  const jobIdFromContext = searchParams.get('jobId');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumePreviewError, setResumePreviewError] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isResumeLoading, setIsResumeLoading] = useState(true);
  const resumeContainerRef = useRef<HTMLDivElement>(null);

  // Function to force download of resume
  const handleDownloadResume = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!candidate.resumeUrl) return;

    try {
      // Fetch the file
      const response = await fetch(candidate.resumeUrl);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${candidate.firstName || 'candidate'}_${candidate.lastName || 'resume'}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading resume:', error);
      // Fallback to regular download if fetch fails
      window.open(candidate.resumeUrl, '_blank');
    }
  };
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [jobMatchContext, setJobMatchContext] = useState<any>(null);
  const [pipelineEntry, setPipelineEntry] = useState<any>(null);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const pipelineStageForTemplates = (pipelineEntry?.stage || 'NEW') as PipelineStage;
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );
  const suggestedTemplate = useMemo(() => {
    const wanted = getSuggestedTemplateType(pipelineStageForTemplates);
    return templates.find((template) => template.type === wanted) || null;
  }, [templates, pipelineStageForTemplates]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchCandidateProfile = async () => {
      if (!params.id || loading) return;
      if (!user) return;

      setIsLoading(true);
      setError(null);
      try {
        // Use profile from auth context if viewing own profile, otherwise fetch
        if (user && user.uid === params.id && profile) {
          console.log('Using profile from auth context for own profile');
          setCandidate(profile as any);
        } else {
          const { data, error } = await getDocument('users', params.id as string);

          if (error) {
            setError(error);
            return;
          }

          if (!data) {
            setError('Candidate not found');
            return;
          }

          // Check if this is actually a job seeker
          if ((data as any).role !== 'JOB_SEEKER') {
            setError('Profile not found');
            return;
          }

          // If user is an employer/recruiter viewing someone else's profile, check completion
          // Admins can view any profile regardless of completion
          if (user && user.uid !== params.id) {
            // Check if user is admin (by email or role)
            const isAdmin = user.email === 'officialhiremeapp@gmail.com' || profile?.role === 'ADMIN';
            
            // Only check completion for employers/recruiters (not admins)
            if (!isAdmin && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER')) {
              const completion = calculateCompletion(data);
              if (completion < 70) {
                setError('This candidate profile is not yet complete. Profiles must be at least 70% complete to be visible to employers.');
                return;
              }
            }
          }

          setCandidate(data);
          setError(null);
        }

        // Track profile view if user is logged in and viewing someone else's profile
        // Only track for employers/recruiters if profile is 70%+ complete (already checked above)
        if (user && user.uid !== params.id) {
          const token = await user.getIdToken();
          await trackProfileView(params.id as string, user.uid, token);
        }

        // Check if candidate is saved (for employers and recruiters)
        if (user && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER')) {
          const { saved } = await isCandidateSaved(user.uid, params.id as string);
          setIsSaved(saved);
        }

        // Fetch endorsements
        const { data: endorsementsData } = await getEndorsements(params.id as string);
        if (endorsementsData) {
          setEndorsements(endorsementsData);
        }

      } catch (err) {
        console.error('Error fetching candidate profile:', err);
        setError('Failed to load candidate profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidateProfile();
  }, [params.id, user, profile, loading]);

  useEffect(() => {
    const fetchMatchContext = async () => {
      if (!user || !candidate?.id) return;
      if (!(profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER' || profile?.role === 'ADMIN')) return;
      const jobId = searchParams.get('jobId');
      if (!jobId) {
        setJobMatchContext(null);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/job/${jobId}/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const payload = await res.json();
        const match = (payload.matches || []).find((m: any) => m.candidateId === candidate.id);
        if (match) setJobMatchContext(match);
      } catch (err) {
        console.error('Failed to fetch match context:', err);
      }
    };
    fetchMatchContext();
  }, [searchParams, user, profile, candidate?.id]);

  useEffect(() => {
    const fetchPipelineContext = async () => {
      if (!candidate?.id || !(profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER')) {
        setPipelineEntry(null);
        return;
      }
      const jobId = searchParams.get('jobId');
      if (!jobId) {
        setPipelineEntry(null);
        return;
      }
      const { data: entry } = await getPipelineEntryForJobCandidate(jobId, candidate.id);
      setPipelineEntry(entry || null);
    };

    fetchPipelineContext();
  }, [searchParams, candidate?.id, profile?.role]);

  // Handle sticky bar visibility
  useEffect(() => {
    const handleScroll = () => {
      if (heroCardRef.current) {
        const rect = heroCardRef.current.getBoundingClientRect();
        setStickyBarVisible(rect.bottom < 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Copy profile link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Get initials
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const handlePipelineStageChange = async (newStage: PipelineStage) => {
    const jobId = searchParams.get('jobId');
    if (!candidate?.id || !jobId) return;
    if (!user?.uid) return;
    setPipelineBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/job/${jobId}/pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidateId: candidate.id,
          stage: newStage,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.entry?.id) {
        toast.error('Pipeline', String(payload?.error || 'Unable to update pipeline stage'));
        return;
      }
      setPipelineEntry(payload.entry);
    } finally {
      setPipelineBusy(false);
    }
  };

  const handlePipelineFollowUpChange = async (date: Date | null) => {
    const jobId = searchParams.get('jobId');
    if (!candidate?.id || !jobId) return;
    if (!user?.uid) return;
    setPipelineBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/job/${jobId}/pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidateId: candidate.id,
          stage: (pipelineEntry?.stage || 'NEW') as PipelineStage,
          nextFollowUpAt: date ? date.toISOString() : null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.entry?.id) {
        toast.error('Pipeline', String(payload?.error || 'Unable to set follow-up date'));
        return;
      }
      setPipelineEntry(payload.entry);
    } finally {
      setPipelineBusy(false);
    }
  };

  const loadCommunicationForJob = async (jobId: string, candidateId: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    const [templatesRes, sequenceRes, interviewRes] = await Promise.all([
      fetchMessageTemplates(token),
      fetchJobSequences(jobId, token, candidateId),
      fetchJobInterviews(jobId, token, candidateId),
    ]);
    if (templatesRes.ok) {
      setTemplates((templatesRes.data.templates || []) as MessageTemplate[]);
    }
    if (sequenceRes.ok) {
      const first = (sequenceRes.data.sequences || [])[0] as OutreachSequence | undefined;
      setSequence(first || null);
    }
    if (interviewRes.ok) {
      const sorted = (interviewRes.data.interviews || [])
        .filter((iv: any) => String(iv?.status || "") !== "CANCELLED")
        .sort((a: any, b: any) => {
          const aTime = new Date(a?.scheduledAt?.toDate ? a.scheduledAt.toDate() : a?.scheduledAt || 0).getTime();
          const bTime = new Date(b?.scheduledAt?.toDate ? b.scheduledAt.toDate() : b?.scheduledAt || 0).getTime();
          return aTime - bTime;
        }) as InterviewEvent[];
      setInterviewEvents(sorted);
      setInterviewEvent(sorted[0] || null);
    }
  };

  const handleApplyTemplate = (template: MessageTemplate) => {
    setMessageContent((prev) => {
      const prefix = prev.trim().length > 0 ? `${prev.trim()}\n\n` : '';
      return `${prefix}${template.body}`.trim();
    });
  };

  const handleSaveTemplate = async () => {
    if (!user || !templateName.trim() || !messageContent.trim()) return;
    setTemplateSaving(true);
    try {
      const token = await user.getIdToken();
      const stage = pipelineStage || 'NEW';
      const res = await upsertMessageTemplate(token, {
        name: templateName.trim(),
        body: messageContent.trim(),
        type: getSuggestedTemplateType(stage),
        stage,
      });
      if (!res.ok) return;
      const refreshed = await fetchMessageTemplates(token);
      if (refreshed.ok) setTemplates((refreshed.data.templates || []) as MessageTemplate[]);
      setTemplateName('');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleStartSequence = async () => {
    const jobForAction = selectedJobId || jobIdFromContext;
    if (!user || !candidate || !jobForAction) return;
    setSequenceBusy(true);
    try {
      const token = await user.getIdToken();
      const selectedStepTemplate = selectedTemplateId || suggestedTemplate?.id || null;
      const res = await upsertJobSequence(jobForAction, token, {
        candidateId: candidate.id,
        steps: [
          {
            delayDays: 0,
            messageTemplateId: selectedStepTemplate,
            body: selectedStepTemplate ? null : (messageContent.trim() || null),
          },
          {
            delayDays: 3,
            messageTemplateId: selectedStepTemplate,
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
    const jobForAction = selectedJobId || jobIdFromContext;
    if (!user || !candidate || !jobForAction) return;
    setSequenceBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await patchJobSequence(jobForAction, token, {
        candidateId: candidate.id,
        status: 'STOPPED',
        stoppedReason: 'MANUAL_STOP',
      });
      if (!res.ok) return;
      setSequence((res.data.sequence || null) as OutreachSequence | null);
    } finally {
      setSequenceBusy(false);
    }
  };

  const handleInterviewPatch = async (
    interview: InterviewEvent,
    body: Record<string, unknown>,
    successTitle: string
  ) => {
    const jobForAction = selectedJobId || jobIdFromContext;
    if (!user || !candidate || !jobForAction || !interview?.id) return;
    setInterviewBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await patchJobInterviewById(jobForAction, interview.id, token, body);
      if (!res.ok) {
        toast.error("Interview update failed", res.error || "Please try again.");
        return;
      }
      const updated = res.data.interview as InterviewEvent;
      setInterviewEvents((prev) => prev.map((iv) => (iv.id === updated.id ? updated : iv)));
      setInterviewEvent(updated);
      toast.success(successTitle, "Interview updated.");
    } finally {
      setInterviewBusy(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !profile || !candidate || !messageContent.trim()) return;

    // For employers and recruiters, require job selection
    if ((profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && !selectedJobId) {
      setError('Please select a job position to attach to your message');
      return;
    }

    setIsSendingMessage(true);
    try {
      const participantIds = [user.uid, candidate.id].sort();

      let threadJobOpts: { jobDetails?: MessageJobDetailsShape } | undefined;
      let jobDetails: MessageJobDetailsShape | null = null;
      if ((profile.role === "EMPLOYER" || profile.role === "RECRUITER") && selectedJobId) {
        const selectedJob = employerJobs.find((job) => job.id === selectedJobId);
        if (selectedJob) {
          jobDetails = {
            jobId: selectedJob.id,
            jobTitle: selectedJob.title,
            jobDescription: String(selectedJob.description || ""),
            employmentType: String(selectedJob.employment || ""),
            location: `${selectedJob.locationCity || ""} ${selectedJob.locationState || ""}`.trim(),
          };
          threadJobOpts = { jobDetails };
        }
      }

      const { id: threadId, error: threadError } = await getOrCreateThread(participantIds, threadJobOpts);

      if (threadError || !threadId) {
        console.error('Error creating thread:', threadError);
        setError('Failed to create message thread');
        return;
      }

      // Auto-accept the thread for the employer who is initiating contact
      const { acceptMessageThread } = await import('@/lib/firebase-firestore');
      await acceptMessageThread(threadId, user.uid);

      const messageData: any = {
        senderId: user.uid,
        senderName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Employer',
        content: messageContent.trim()
      };
      
      // Only add jobDetails if it exists
      if (jobDetails) {
        messageData.jobDetails = jobDetails;
      }

      const token = await user.getIdToken();
      const { error: messageError } = await sendMessage(threadId, messageData, token);

      if (messageError) {
        console.error('Error sending message:', messageError);
        setError(typeof messageError === 'string' ? messageError : 'Failed to send message');
        return;
      }

      // Close dialog and redirect to messages
      setShowMessageDialog(false);
      setMessageContent('');
      setSelectedJobId('');
      const jid = jobDetails?.jobId || selectedJobId;
      router.push(jid ? `/messages/${threadId}?jobId=${encodeURIComponent(jid)}` : `/messages/${threadId}`);

    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      setError('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleOpenMessageDialog = async () => {
    if (!user || !candidate) return;

    if (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER') {
      try {
        let jobs: any[] = [];
        if (profile.role === 'RECRUITER' && profile.companyId) {
          const { data, error } = await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false);
          if (!error && data) jobs = data;
        } else {
          const { data, error } = await getEmployerJobs(user.uid);
          if (!error && data) jobs = data;
        }
        setEmployerJobs(jobs);

        const contextJobId = selectedJobId || jobIdFromContext || (jobs[0]?.id || null);
        const participantIds = [user.uid, candidate.id].sort();
        let threadJobOpts: { jobDetails?: MessageJobDetailsShape } | undefined;
        if (contextJobId) {
          const selectedJob = jobs.find((job) => job.id === contextJobId);
          if (selectedJob) {
            threadJobOpts = {
              jobDetails: {
                jobId: selectedJob.id,
                jobTitle: selectedJob.title,
                jobDescription: String(selectedJob.description || ""),
                employmentType: String(selectedJob.employment || ""),
                location: `${selectedJob.locationCity || ""} ${selectedJob.locationState || ""}`.trim(),
              },
            };
          }
        }
        const { id: threadId, error: threadError } = await getOrCreateThread(participantIds, threadJobOpts);
        if (threadError || !threadId) {
          setError("Failed to open thread");
          return;
        }
        const { acceptMessageThread } = await import('@/lib/firebase-firestore');
        await acceptMessageThread(threadId, user.uid);
        router.push(contextJobId ? `/messages/${threadId}?jobId=${encodeURIComponent(contextJobId)}` : `/messages/${threadId}`);
        return;
      } catch (err) {
        console.error("Error opening thread:", err);
        setError("Failed to open thread");
        return;
      }
    }

    if (profile?.role !== 'EMPLOYER' && profile?.role !== 'RECRUITER') {
      setShowMessageDialog(true);
      return;
    }
  };

  useEffect(() => {
    const recruiterView = profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER';
    if (!candidate?.id || !recruiterView) return;
    const action = searchParams.get('action');
    if (action === 'message' && !showMessageDialog) {
      handleOpenMessageDialog();
    }
    if (action === "interview") {
      setEditingInterview(null);
      setShowScheduleInterviewModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id, profile?.role, searchParams, showMessageDialog]);

  useEffect(() => {
    if (!showMessageDialog) return;
    if (!selectedJobId || !candidate?.id || !user) return;
    loadCommunicationForJob(selectedJobId, candidate.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMessageDialog, selectedJobId, candidate?.id, user?.uid]);

  useEffect(() => {
    if (!user || !candidate?.id || !jobIdFromContext) return;
    if (profile?.role !== 'EMPLOYER' && profile?.role !== 'RECRUITER') return;
    loadCommunicationForJob(jobIdFromContext, candidate.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, candidate?.id, jobIdFromContext, profile?.role]);

  const handleSaveCandidate = async () => {
    if (!user || (profile?.role !== 'EMPLOYER' && profile?.role !== 'RECRUITER') || !candidate) return;

    setIsSaving(true);
    try {
      const { error, saved } = await saveCandidate(user.uid, candidate.id);
      
      if (error) {
        console.error('Error saving candidate:', error);
        return;
      }

      setIsSaved(saved);
    } catch (err) {
      console.error('Error in handleSaveCandidate:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/search/candidates" 
            className="text-navy-800 hover:text-navy-600 underline"
          >
            Back to candidate search
          </Link>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const candidateName = `${candidate.firstName || 'First'} ${candidate.lastName || 'Last'}`;
  const matchingNormalization = (candidate.matchingNormalization || {}) as Record<string, any>;
  const targetRoles = Array.isArray(candidate.targetRolesV2) ? candidate.targetRolesV2 : [];
  const functionInterests = Array.isArray(candidate.interestFunctionsV2) ? candidate.interestFunctionsV2 : [];
  const structuredSkills = Array.isArray(candidate.skillsV2) ? candidate.skillsV2 : [];
  const structuredExperience = Array.isArray(candidate.experienceProjectsV2) ? candidate.experienceProjectsV2 : [];
  const readinessSignals = {
    resume: Boolean(candidate.resumeUrl),
    video: Boolean(candidate.videoUrl),
    transcript: Boolean(candidate.transcriptUrl),
    endorsements: Array.isArray(endorsements) ? endorsements.length : 0,
  };
  const topSkills = (candidate.skills || []).slice(0, 8);
  const structuredSkillProof = structuredSkills
    .filter((s: any) => s?.name)
    .slice(0, 5)
    .map((s: any) => `${s.name}${s.proficiency ? ` (${String(s.proficiency).toLowerCase()})` : ''}`);
  const experienceProofSnippets = structuredExperience
    .slice(0, 3)
    .map((exp: any) => `${exp.title || 'Experience'}${exp.organization ? ` at ${exp.organization}` : ''}`);
  const potentialGaps = [
    !targetRoles.length ? 'No target roles listed' : '',
    !topSkills.length ? 'No core skill tags listed' : '',
    !structuredExperience.length && !candidate.experience ? 'No structured experience evidence added' : '',
    !candidate.gpa ? 'GPA not listed' : '',
    !readinessSignals.resume ? 'Resume missing' : '',
    !readinessSignals.video ? 'Intro video missing' : '',
    !candidate.workAuthorization ? 'Work authorization not specified' : '',
  ].filter(Boolean);
  const pipelineStage = (pipelineEntry?.stage || 'NEW') as PipelineStage;
  const followUpRaw = pipelineEntry?.nextFollowUpAt;
  const nextFollowUpDate = followUpRaw
    ? new Date(followUpRaw?.toDate ? followUpRaw.toDate() : followUpRaw)
    : null;
  const followUpDue = !!nextFollowUpDate && nextFollowUpDate.getTime() < Date.now();
  const isAdminViewer = user?.email === 'officialhiremeapp@gmail.com' || profile?.role === 'ADMIN';
  const isEmployerOrRecruiter = profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER';
  const viewingAsRecruiter = user?.uid !== candidate.id && isEmployerOrRecruiter && !isAdminViewer;
  const selectedJobTitle =
    employerJobs.find((job) => job.id === (selectedJobId || jobIdFromContext))?.title ||
    jobMatchContext?.jobTitle ||
    "";
  const templateStage = pipelineStage || 'NEW';
  const recruiterJobHero = viewingAsRecruiter && !!jobIdFromContext;
  const heroShortlistPrimary =
    recruiterJobHero &&
    (!pipelineEntry || pipelineStage === "NEW" || pipelineStage === "REJECTED");
  const heroMessagePrimary =
    recruiterJobHero && ["SHORTLIST", "CONTACTED", "RESPONDED"].includes(pipelineStage);
  const heroEvaluatePrimary = recruiterJobHero && ["INTERVIEW", "FINALIST"].includes(pipelineStage);

  const interviewScheduledText = interviewEvent?.scheduledAt
    ? new Date(
        (interviewEvent.scheduledAt as any)?.toDate
          ? (interviewEvent.scheduledAt as any).toDate()
          : (interviewEvent.scheduledAt as any)
      ).toLocaleString()
    : '';

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* Sticky Action Bar */}
      {user?.uid !== candidate.id && (
        <div className={`fixed top-14 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-30 transition-all duration-200 ${stickyBarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {candidate.profileImageUrl ? (
                  <img src={candidate.profileImageUrl} alt={candidateName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sky-200 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-navy-900 text-sm">{getInitials(candidate.firstName, candidate.lastName)}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-navy-900 text-base truncate">{candidateName}</h3>
                  <p className="text-sm text-slate-600 truncate">{candidate.headline || 'Job Seeker'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {recruiterJobHero ? (
                  <>
                    {heroShortlistPrimary && (
                      <button
                        type="button"
                        onClick={() => void handlePipelineStageChange("SHORTLIST")}
                        disabled={pipelineBusy}
                        className="bg-navy-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial min-h-[48px] disabled:opacity-60"
                      >
                        Shortlist
                      </button>
                    )}
                    {heroMessagePrimary && (
                      <button
                        onClick={handleOpenMessageDialog}
                        className="bg-navy-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial min-h-[48px]"
                      >
                        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>Message</span>
                      </button>
                    )}
                    {heroEvaluatePrimary && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            document.getElementById("recruiter-notes")?.scrollIntoView({ behavior: "smooth" })
                          }
                          className="bg-navy-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial min-h-[48px]"
                        >
                          Evaluate / review
                        </button>
                        <button
                          onClick={handleOpenMessageDialog}
                          className="bg-white border border-slate-200 text-navy-900 px-4 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 text-sm min-h-[48px]"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </button>
                      </>
                    )}
                    {heroShortlistPrimary && (
                      <button
                        onClick={handleOpenMessageDialog}
                        className="bg-white border border-slate-200 text-navy-900 px-4 py-2.5 rounded-lg font-semibold hover:bg-slate-50 text-sm min-h-[48px]"
                      >
                        Message
                      </button>
                    )}
                    {!heroShortlistPrimary && !heroMessagePrimary && !heroEvaluatePrimary && (
                      <button
                        onClick={handleOpenMessageDialog}
                        className="bg-navy-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-navy-700 flex items-center justify-center gap-2 text-sm min-h-[48px]"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleOpenMessageDialog}
                      className="bg-navy-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial min-h-[48px]"
                    >
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Message</span>
                    </button>
                    <button
                      onClick={handleSaveCandidate}
                      disabled={isSaving}
                      className={`p-2.5 sm:p-3 rounded-lg transition-all w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center min-h-[48px] sm:min-h-0 ${
                        isSaved
                          ? "bg-sky-50 text-navy-800 border-2 border-sky-600"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-navy-800 hover:text-navy-900"
                      }`}
                    >
                      <Heart className={`h-5 w-5 sm:h-4 sm:w-4 ${isSaved ? "fill-current" : ""}`} />
                    </button>
                  </>
                )}
                {!recruiterJobHero && candidate.resumeUrl && (
                  <button
                    onClick={async () => {
                      setShowResumeModal(true);
                      setResumePreviewError(false);
                      setUseGoogleViewer(false);
                      setIsResumeLoading(true);

                      try {
                        const response = await fetch(candidate.resumeUrl, { method: "HEAD" });
                        if (!response.ok) {
                          setResumePreviewError(true);
                        }
                      } catch (error) {
                        console.error("Error checking resume accessibility:", error);
                      } finally {
                        setIsResumeLoading(false);
                      }
                    }}
                    className="bg-white border border-slate-200 text-navy-900 px-4 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base min-h-[48px]"
                  >
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Resume</span>
                  </button>
                )}
                {recruiterJobHero && candidate.resumeUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      setShowResumeModal(true);
                      setResumePreviewError(false);
                      setUseGoogleViewer(false);
                      setIsResumeLoading(true);
                      try {
                        const response = await fetch(candidate.resumeUrl, { method: "HEAD" });
                        if (!response.ok) setResumePreviewError(true);
                      } catch (error) {
                        console.error("Error checking resume accessibility:", error);
                      } finally {
                        setIsResumeLoading(false);
                      }
                    }}
                    className="p-2.5 rounded-lg border border-slate-200 text-navy-900 hover:bg-slate-50 min-h-[48px] w-12 flex items-center justify-center"
                    aria-label="Resume"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {isAdminViewer ? (
              <Link
                href="/admin/users"
                className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[48px]"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium text-sm sm:text-base">Back to admin</span>
              </Link>
            ) : user?.uid === candidate.id ? (
              <Link
                href="/home/seeker"
                className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[48px]"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium text-sm sm:text-base">Back to dashboard</span>
              </Link>
            ) : viewingAsRecruiter ? (
              <>
                {jobIdFromContext ? (
                  <Link
                    href={getJobMatchesUrl(jobIdFromContext)}
                    className="flex items-center gap-2 text-navy-800 hover:text-navy-600 px-3 py-2 rounded-lg hover:bg-sky-50 min-h-[48px] text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Back to candidates</span>
                    <span className="sm:hidden">Candidates</span>
                  </Link>
                ) : (
                  <Link
                    href="/search/candidates"
                    className="flex items-center gap-2 text-navy-800 hover:text-navy-600 px-3 py-2 rounded-lg hover:bg-sky-50 min-h-[48px] text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    Back to talent search
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/home/seeker"
                className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[48px]"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium text-sm sm:text-base">Back</span>
              </Link>
            )}
          </div>
          <Link
            href={
              user?.uid === candidate.id
                ? "/home/seeker"
                : profile?.role === "EMPLOYER" || profile?.role === "RECRUITER"
                  ? getDashboardUrl()
                  : "/"
            }
            className="flex items-center gap-2 shrink-0 self-end sm:self-auto"
          >
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10 xl:py-12">
        {jobIdFromContext && (profile?.role === "EMPLOYER" || profile?.role === "RECRUITER") && (
          <section className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Viewing for</p>
            <p className="text-sm font-semibold text-navy-900 mt-0.5">
              {selectedJobTitle || "This requisition"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={getJobMatchesUrl(jobIdFromContext)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-navy-800 hover:bg-slate-100"
              >
                Back to candidates
              </Link>
              <Link
                href={getJobPipelineUrl(jobIdFromContext)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-navy-800 hover:bg-slate-100"
              >
                Pipeline
              </Link>
              <Link
                href={getJobOverviewUrl(jobIdFromContext)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-navy-800 hover:bg-slate-100"
              >
                Job overview
              </Link>
            </div>
          </section>
        )}

        {/* Hero Summary Card */}
        <section ref={heroCardRef} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
            <div className="flex items-start space-x-3 sm:space-x-4 md:space-x-6 w-full lg:w-auto">
              {candidate.profileImageUrl ? (
                <img src={candidate.profileImageUrl} alt={candidateName} className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-4 border-white shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-sky-200 flex items-center justify-center flex-shrink-0 border-4 border-white shadow-lg">
                  <span className="font-bold text-navy-900 text-2xl">{getInitials(candidate.firstName, candidate.lastName)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1
                  className={`font-bold text-navy-900 tracking-tight mb-2 break-words ${
                    recruiterJobHero ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
                  }`}
                >
                  {candidateName}
                </h1>
                <p
                  className={`mb-4 break-words ${
                    recruiterJobHero
                      ? "text-sm sm:text-base text-slate-600"
                      : "text-xl text-slate-600"
                  }`}
                >
                  {candidate.headline || "Job Seeker"}
                </p>
                {candidate.bio && (
                  <p className="text-slate-600 mb-4 leading-relaxed break-words">{candidate.bio}</p>
                )}
                <div
                  className={`flex flex-wrap items-center gap-4 text-slate-600 ${
                    recruiterJobHero ? "text-xs sm:text-sm" : "text-sm"
                  }`}
                >
                  {candidate.school && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="break-words">{candidate.school}{candidate.major ? ` • ${candidate.major}` : ''}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="break-words">{candidate.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{candidate.skills?.length || 0} skills</span>
                  </div>
                </div>
              </div>
            </div>
            {user?.uid !== candidate.id && (
              <div className="flex flex-col gap-2 sm:gap-3 lg:flex-shrink-0 w-full lg:w-auto">
                {recruiterJobHero ? (
                  <>
                    {heroShortlistPrimary && (
                      <button
                        type="button"
                        onClick={() => void handlePipelineStageChange("SHORTLIST")}
                        disabled={pipelineBusy}
                        className={`${recruiterBtnPrimaryLg} w-full sm:w-auto px-8 py-4 disabled:opacity-60`}
                      >
                        Shortlist for this job
                      </button>
                    )}
                    {heroMessagePrimary && (
                      <button
                        onClick={handleOpenMessageDialog}
                        className={`${recruiterBtnPrimaryLg} w-full sm:w-auto px-8 py-4`}
                      >
                        <MessageSquare className="h-5 w-5" />
                        <span>Message {candidate.firstName || "Candidate"}</span>
                      </button>
                    )}
                    {heroEvaluatePrimary && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            document.getElementById("recruiter-notes")?.scrollIntoView({ behavior: "smooth" })
                          }
                          className={`${recruiterBtnPrimaryLg} w-full sm:w-auto px-8 py-4`}
                        >
                          Evaluate / review
                        </button>
                        <button
                          onClick={handleOpenMessageDialog}
                          className={`${recruiterBtnSecondary} w-full sm:w-auto px-8 py-3`}
                        >
                          <MessageSquare className="h-5 w-5" />
                          Message
                        </button>
                      </>
                    )}
                    {heroShortlistPrimary && (
                      <button
                        onClick={handleOpenMessageDialog}
                        className={`${recruiterBtnSecondary} w-full sm:w-auto px-8 py-3`}
                      >
                        Message without shortlisting
                      </button>
                    )}
                    {!heroShortlistPrimary && !heroMessagePrimary && !heroEvaluatePrimary && (
                      <button
                        onClick={handleOpenMessageDialog}
                        className={`${recruiterBtnPrimaryLg} w-full sm:w-auto px-8 py-4`}
                      >
                        <MessageSquare className="h-5 w-5" />
                        <span>Message {candidate.firstName || "Candidate"}</span>
                      </button>
                    )}
                    {candidate?.id && (
                      <AddToTalentPoolButton
                        candidateId={candidate.id}
                        className="w-full"
                        buttonClassName="w-full inline-flex items-center justify-center gap-2 border border-dashed border-slate-300 text-slate-700 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-50"
                      />
                    )}
                    {candidate.resumeUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          setShowResumeModal(true);
                          setResumePreviewError(false);
                          setUseGoogleViewer(false);
                          setIsResumeLoading(true);
                          try {
                            const response = await fetch(candidate.resumeUrl, { method: "HEAD" });
                            if (!response.ok) setResumePreviewError(true);
                          } catch (error) {
                            console.error("Error checking resume accessibility:", error);
                          } finally {
                            setIsResumeLoading(false);
                          }
                        }}
                        className="bg-white border border-slate-200 text-navy-900 px-8 py-3 rounded-lg font-semibold shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2"
                      >
                        <FileText className="h-5 w-5" />
                        <span>View resume</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleOpenMessageDialog}
                      className="bg-navy-800 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-5 w-5" />
                      <span>Message {candidate.firstName || "Candidate"}</span>
                    </button>
                    <button
                      onClick={handleSaveCandidate}
                      disabled={isSaving}
                      className={`bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 ${
                        isSaved ? "text-navy-800 border-sky-600 bg-sky-50" : ""
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
                      <span>Save Candidate</span>
                    </button>
                    {(profile?.role === "EMPLOYER" || profile?.role === "RECRUITER" || profile?.role === "ADMIN") &&
                      candidate?.id && (
                        <AddToTalentPoolButton
                          candidateId={candidate.id}
                          className="w-full"
                          buttonClassName="w-full inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50"
                        />
                      )}
                    {candidate.resumeUrl && (
                      <button
                        onClick={async () => {
                          setShowResumeModal(true);
                          setResumePreviewError(false);
                          setUseGoogleViewer(false);
                          setIsResumeLoading(true);
                          try {
                            const response = await fetch(candidate.resumeUrl, { method: "HEAD" });
                            if (!response.ok) setResumePreviewError(true);
                          } catch (error) {
                            console.error("Error checking resume accessibility:", error);
                          } finally {
                            setIsResumeLoading(false);
                          }
                        }}
                        className="bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      >
                        <FileText className="h-5 w-5" />
                        <span>View Resume</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Pipeline Context (recruiter-facing with job context) */}
        {user?.uid !== candidate.id && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER') && jobIdFromContext && (
          <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-800" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy-900">Pipeline for this job</h2>
                <p className="text-sm text-slate-600">
                  Shortlist = serious contenders. Pipeline = everyone you are actively working for this requisition.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700">Attention:</span>{" "}
                  {formatRecruiterAttentionLine({
                    pipelineStage,
                    hasEvaluation: false,
                    isEvaluationComplete: true,
                    reviewStatus: null,
                    nextFollowUpAt: pipelineEntry?.nextFollowUpAt,
                    interviewAt: interviewEvent?.scheduledAt,
                    sequence,
                  })}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${recruiterBadge.neutral}`}>
                  Stage: {pipelineStageLabel(pipelineStage)}
                </span>
                {followUpDue && (
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${recruiterBadge.urgent}`}>
                    Follow-up due
                  </span>
                )}
                {nextFollowUpDate && (
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${recruiterBadge.pending}`}>
                    Next follow-up: {nextFollowUpDate.toLocaleDateString()}
                  </span>
                )}
                {sequence?.status && (
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    sequence.status === "ACTIVE"
                      ? "border border-sky-200 bg-sky-50 text-sky-950"
                      : recruiterBadge.neutral
                  }`}>
                    Sequence: {sequence.status}
                  </span>
                )}
                {Boolean(interviewEvent?.scheduledAt) && (
                  <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-navy-900">
                    Interview: {interviewScheduledText}
                  </span>
                )}
              </div>
              <p className="mb-3 text-xs text-slate-600">
                <Link href={getMessagesUrl(jobIdFromContext)} className="font-semibold text-sky-800 hover:underline">
                  Job messages
                </Link>
                <span className="text-slate-400"> · </span>
                <Link href={getJobCompareUrl(jobIdFromContext)} className="font-semibold text-sky-800 hover:underline">
                  Compare
                </Link>
                <span className="text-slate-400"> · </span>
                <Link href={getCandidatesSearchUrl(jobIdFromContext)} className="font-semibold text-sky-800 hover:underline">
                  Find candidates
                </Link>
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={pipelineStage}
                  onChange={(e) => handlePipelineStageChange(e.target.value as PipelineStage)}
                  disabled={pipelineBusy}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
                >
                  {PIPELINE_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {pipelineStageLabel(stage)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const autoDate = new Date();
                    autoDate.setDate(autoDate.getDate() + 3);
                    autoDate.setHours(12, 0, 0, 0);
                    handlePipelineFollowUpChange(autoDate);
                  }}
                  disabled={pipelineBusy}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Auto follow-up (+3 days)
                </button>
                <button
                  type="button"
                  onClick={() => handlePipelineFollowUpChange(null)}
                  disabled={pipelineBusy}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Mark follow-up done
                </button>
              </div>
              <details className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600 select-none">
                  Advanced workflow (optional)
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleStartSequence}
                    disabled={sequenceBusy || !jobIdFromContext}
                    className="px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sm font-medium text-navy-900 hover:bg-sky-100 disabled:opacity-60"
                  >
                    Start sequence
                  </button>
                  <button
                    type="button"
                    onClick={handleStopSequence}
                    disabled={sequenceBusy || !jobIdFromContext || sequence?.status !== "ACTIVE"}
                    className="px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sm font-medium text-navy-900 hover:bg-sky-100 disabled:opacity-60"
                  >
                    Stop sequence
                  </button>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-900">Interviews</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInterview(null);
                        setShowScheduleInterviewModal(true);
                      }}
                      disabled={!jobIdFromContext}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Schedule interview
                    </button>
                  </div>
                  <div className="space-y-2">
                    {interviewEvents.length === 0 ? (
                      <p className="text-xs text-slate-500">No interviews yet.</p>
                    ) : (
                      interviewEvents.map((iv) => (
                        <InterviewCard
                          key={iv.id}
                          interview={iv}
                          onReschedule={(x) => {
                            setEditingInterview(x);
                            setShowScheduleInterviewModal(true);
                          }}
                          onCancel={(x) => handleInterviewPatch(x, { status: "CANCELLED" }, "Interview cancelled")}
                          onComplete={(x) => handleInterviewPatch(x, { status: "COMPLETED" }, "Interview marked completed")}
                          onCandidateResponse={(x, response) =>
                            handleInterviewPatch(
                              x,
                              {
                                candidateResponse: response,
                                status: response === "REQUEST_RESCHEDULE" ? "RESCHEDULE_REQUESTED" : "CONFIRMED",
                              },
                              response === "REQUEST_RESCHEDULE" ? "Reschedule requested" : "Candidate response updated"
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              </details>
              {user?.uid && (
                <div className="mt-4" id="recruiter-notes">
                  {jobIdFromContext && (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-navy-900">Team collaboration</h3>
                          <p className="text-xs text-slate-600">Share candidates internally and gather feedback from your hiring team.</p>
                        </div>
                        <SendCandidateForReviewButton
                          jobId={jobIdFromContext}
                          candidateId={candidate.id}
                          candidateName={`${candidate.firstName || ""} ${candidate.lastName || ""}`.trim()}
                        />
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <ReviewAssignmentPanel jobId={jobIdFromContext} candidateId={candidate.id} />
                        <InternalCommentsPanel jobId={jobIdFromContext} candidateId={candidate.id} />
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <RecruiterDecisionPanel
                      jobId={jobIdFromContext}
                      candidateId={candidate.id}
                      pipelineStage={pipelineStage}
                    />
                  </div>
                  <RecruiterNotesPanel
                    jobId={jobIdFromContext}
                    candidateId={candidate.id}
                    userId={user.uid}
                    title="Recruiter notes for this candidate + job"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {user?.uid !== candidate.id &&
          (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER' || profile?.role === 'ADMIN') &&
          candidate?.id && <CandidateTalentPoolsSection candidateId={candidate.id} />}

        {/* Matching Dimensions Snapshot (recruiter-facing) */}
        {user?.uid !== candidate.id && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER' || profile?.role === 'ADMIN') && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Building2 className="h-6 w-6 text-navy-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-navy-900">Matching Dimensions Snapshot</h2>
                <p className="text-sm text-slate-600">These are the same dimensions used by ranking and explanation logic.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Target role alignment:</strong> {targetRoles.length ? targetRoles.join(', ') : 'No target roles added'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Functional interest alignment:</strong> {functionInterests.length ? functionInterests.join(', ') : 'No function interests added'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Hard skill alignment:</strong> {(candidate.skills || []).length ? (candidate.skills || []).slice(0, 10).join(', ') : 'No core skills listed'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Skill evidence / proof:</strong> {structuredSkills.length ? structuredSkills.filter((s: any) => s?.name).slice(0, 6).map((s: any) => `${s.name}${s.proficiency ? ` (${s.proficiency})` : ''}`).join(', ') : 'No structured skill proof yet'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Experience/project evidence:</strong> {structuredExperience.length ? `${structuredExperience.length} structured entries` : 'No structured entries'} {candidate.experience ? ' + narrative experience provided' : ''}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Industry alignment:</strong> {(candidate.interestIndustriesV2 || candidate.careerInterests || []).length ? (candidate.interestIndustriesV2 || candidate.careerInterests).slice(0, 8).join(', ') : 'No industry interests listed'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Work preference alignment:</strong> {[...(candidate.workPreferences || []), ...(candidate.jobTypes || []), ...(candidate.locations || [])].slice(0, 8).join(', ') || 'No preferences listed'}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Education / major / GPA alignment:</strong> {(matchingNormalization.normalizedMajors || candidate.major || 'N/A')} {candidate.gpa ? `• GPA ${candidate.gpa}` : ''}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Authorization / sponsorship alignment:</strong> {candidate.workAuthorization?.authorizedToWork == null ? 'Not specified' : candidate.workAuthorization.authorizedToWork ? 'Authorized to work' : 'Not currently authorized'} {candidate.workAuthorization?.requiresVisaSponsorship === true ? '• Requires sponsorship' : candidate.workAuthorization?.requiresVisaSponsorship === false ? '• No sponsorship required' : ''}</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><strong>Recruiter confidence/readiness:</strong> {readinessSignals.resume ? 'Resume' : 'No resume'} • {readinessSignals.video ? 'Video' : 'No video'} • {readinessSignals.transcript ? 'Transcript' : 'No transcript'} • {readinessSignals.endorsements} endorsements</div>
            </div>
          </section>
        )}

        {/* Recruiter Match Summary */}
        {user?.uid !== candidate.id && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER' || profile?.role === 'ADMIN') && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Star className="h-6 w-6 text-navy-900" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-navy-900">Recruiter Match Summary</h2>
                <p className="text-sm text-slate-600">Decision-first view aligned to the ranking dimensions.</p>
              </div>
            </div>
            {jobMatchContext && (
              <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm">
                <p className="font-semibold text-navy-900 mb-2">Why this candidate ranked here</p>
                <p className="text-slate-700">{jobMatchContext.explanation || 'Match explanation unavailable.'}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-slate-700">
                  <div>Overall: <span className="font-semibold">{jobMatchContext.overallScore ?? 'N/A'}</span></div>
                  <div>Title: <span className="font-semibold">{jobMatchContext.titleScore ?? 'N/A'}</span></div>
                  <div>Skills: <span className="font-semibold">{jobMatchContext.skillsScore ?? 'N/A'}</span></div>
                  <div>Preference: <span className="font-semibold">{jobMatchContext.preferenceScore ?? 'N/A'}</span></div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">1. Why this candidate matched</p>
                <p className="text-navy-900">
                  Target roles: {targetRoles.length ? targetRoles.join(', ') : 'Not specified'}.
                  Strongest skills: {topSkills.length ? topSkills.slice(0, 4).join(', ') : 'Not specified'}.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">2. Potential gaps</p>
                <p className="text-navy-900">{potentialGaps.length ? potentialGaps.slice(0, 3).join(' • ') : 'No obvious critical gaps from profile data.'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">3. Match highlights</p>
                <p className="text-navy-900">
                  Experience proof: {experienceProofSnippets.length ? experienceProofSnippets.join(' • ') : 'No structured experience snippets yet'}.
                  {structuredSkillProof.length ? ` Skill proof: ${structuredSkillProof.join(' • ')}.` : ''}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">4. Recruiter confidence signals</p>
                <p className="text-navy-900">
                  {readinessSignals.resume ? 'Resume' : 'No resume'} • {readinessSignals.video ? 'Video' : 'No video'} • {readinessSignals.transcript ? 'Transcript' : 'No transcript'} • {readinessSignals.endorsements} endorsements
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Video Section */}
        {candidate.videoUrl && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Video className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Profile Video</h2>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden">
              <video 
                src={candidate.videoUrl} 
                controls 
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </section>
        )}

        {/* Education Card */}
        {(candidate.education && candidate.education.length > 0) || candidate.graduationYear || candidate.gpa ? (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <GraduationCap className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Education</h2>
            </div>
            <div className="space-y-6">
              {candidate.education && candidate.education.length > 0 ? (
                candidate.education.map((edu: any, index: number) => (
                  <div key={index} className="timeline-item">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <h3 className="font-bold text-navy-900 text-lg">
                          {edu.degree}{edu.majors?.length > 0 ? ` in ${edu.majors.join(', ')}` : ''}
                        </h3>
                        {edu.majors?.length > 0 && <p className="text-slate-600">{edu.majors.join(', ')}</p>}
                        {edu.school && <p className="text-slate-600 text-sm">{edu.school}</p>}
                        {edu.minors?.length > 0 && <p className="text-slate-600 text-sm">Minor: {edu.minors.join(', ')}</p>}
                        {edu.gpa && <p className="text-slate-600 text-sm">GPA: {edu.gpa}</p>}
                      </div>
                      {edu.graduationYear && (
                        <div className="text-sm text-slate-500 font-medium">{edu.graduationYear}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="timeline-item">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      {candidate.graduationYear && <h3 className="font-bold text-navy-900 text-lg">Graduation: {candidate.graduationYear}</h3>}
                      {candidate.gpa && <p className="text-slate-600">GPA: {candidate.gpa}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Extracurricular Activities Card */}
        {candidate.experience && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Star className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Extracurricular Activities</h2>
            </div>
            <div className="text-slate-600 leading-relaxed">
              <p className="whitespace-pre-wrap">{candidate.experience}</p>
            </div>
          </section>
        )}

        {/* Extracurricular Activities (array) Card */}
        {candidate.extracurriculars && candidate.extracurriculars.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Star className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Extracurricular Activities</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.extracurriculars.map((activity: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {activity}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Resume Card */}
        {candidate.resumeUrl && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <FileText className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Resume</h2>
            </div>
            <div className="flex items-center justify-between p-6 bg-sky-50 rounded-xl border border-sky-100">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-navy-700" />
                <div>
                  <p className="font-semibold text-navy-900">Resume available</p>
                  <p className="text-sm text-slate-600">Click to view or download</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setShowResumeModal(true);
                  setResumePreviewError(false);
                  setUseGoogleViewer(false);
                  setIsResumeLoading(true);
                  
                  // Verify PDF is accessible
                  try {
                    const response = await fetch(candidate.resumeUrl, { method: 'HEAD' });
                    if (!response.ok) {
                      setResumePreviewError(true);
                    }
                  } catch (error) {
                    console.error('Error checking resume accessibility:', error);
                    // Don't set error immediately, let the embed/iframe try first
                  } finally {
                    setIsResumeLoading(false);
                  }
                }}
                className="bg-navy-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center gap-2"
              >
                <FileText className="h-5 w-5" />
                <span>View Resume</span>
              </button>
            </div>
          </section>
        )}

        {/* Professional Links Card */}
        {(candidate.linkedinUrl || candidate.portfolioUrl) && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Globe className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Professional Links</h2>
            </div>
            <div className="space-y-4">
              {candidate.linkedinUrl && (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-sky-50 rounded-xl border border-sky-100 hover:bg-sky-100 transition-all"
                >
                  <i className="fa-brands fa-linkedin text-2xl text-[#0077B5]"></i>
                  <div>
                    <p className="font-semibold text-navy-900">LinkedIn Profile</p>
                    <p className="text-sm text-slate-600">{candidate.linkedinUrl}</p>
                  </div>
                </a>
              )}
              {candidate.portfolioUrl && (
                <a
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-sky-50 rounded-xl border border-sky-100 hover:bg-sky-100 transition-all"
                >
                  <Globe className="h-6 w-6 text-navy-700" />
                  <div>
                    <p className="font-semibold text-navy-900">Portfolio</p>
                    <p className="text-sm text-slate-600">{candidate.portfolioUrl}</p>
                  </div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Skills & Languages Card */}
        {(candidate.skills && candidate.skills.length > 0) || (candidate.languages && candidate.languages.length > 0) ? (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Code className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Skills & Languages</h2>
            </div>
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-navy-700 mb-2">Technical & Professional Skills</h3>
                <div className="flex flex-wrap gap-3">
                  {candidate.skills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {candidate.languages && candidate.languages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-navy-700 mb-2">Languages</h3>
                <div className="flex flex-wrap gap-3">
                  {candidate.languages.map((lang: string | LanguageSkill, index: number) => {
                    // Handle both old format (string) and new format (LanguageSkill object)
                    const languageName = typeof lang === 'string' ? lang : lang.language;
                    return (
                      <span
                        key={index}
                        className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {languageName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {/* Location & Work Preferences Card */}
        {(candidate.locations && candidate.locations.length > 0) || (candidate.workPreferences && candidate.workPreferences.length > 0) || (candidate.jobTypes && candidate.jobTypes.length > 0) ? (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Location & Work Preferences</h2>
            </div>
            {candidate.locations && candidate.locations.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-navy-700 mb-2">Preferred Work Locations</h3>
                <div className="flex flex-wrap gap-3">
                  {candidate.locations.map((location: string, index: number) => (
                    <span
                      key={index}
                      className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                    >
                      <MapPin className="h-3 w-3" />
                      <span>{location}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {candidate.workPreferences && candidate.workPreferences.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-navy-700 mb-2">Work Arrangements</h3>
                <div className="flex flex-wrap gap-3">
                  {candidate.workPreferences.map((pref: string, index: number) => (
                    <span
                      key={index}
                      className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                    >
                      {pref}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {candidate.jobTypes && candidate.jobTypes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-navy-700 mb-2">Preferred Job Types</h3>
                <div className="flex flex-wrap gap-3">
                  {candidate.jobTypes.map((type: string, index: number) => (
                    <span
                      key={index}
                      className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {/* Certifications Card */}
        {candidate.certifications && candidate.certifications.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Certifications</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.certifications.map((cert: string | {name: string; verificationLink?: string; verificationCode?: string}, index: number) => {
                // Handle both old format (string) and new format (object)
                const certName = typeof cert === 'string' ? cert : cert.name;
                return (
                  <span
                    key={index}
                    className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                  >
                    {certName}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* Career Interests Card */}
        {candidate.careerInterests && candidate.careerInterests.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Career Interests</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.careerInterests.map((interest: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Work Authorization Card */}
        {candidate.workAuthorization && (candidate.workAuthorization.authorizedToWork !== null || candidate.workAuthorization.requiresVisaSponsorship !== null) && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Globe className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Work Authorization</h2>
            </div>
            <div className="space-y-3">
              {candidate.workAuthorization.authorizedToWork !== null && (
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${candidate.workAuthorization.authorizedToWork ? "bg-sky-600" : "bg-slate-400"}`}></div>
                  <span className="text-slate-600">
                    <strong className="text-navy-900">Authorized to work in the US:</strong> {candidate.workAuthorization.authorizedToWork ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {candidate.workAuthorization.requiresVisaSponsorship !== null && (
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${!candidate.workAuthorization.requiresVisaSponsorship ? "bg-sky-600" : "bg-slate-400"}`}></div>
                  <span className="text-slate-600">
                    <strong className="text-navy-900">Requires visa sponsorship:</strong> {candidate.workAuthorization.requiresVisaSponsorship ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Endorsements Card */}
        {endorsements && endorsements.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Star className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Endorsements</h2>
            </div>
            <div className="space-y-6">
              {endorsements.map((endorsement: any, index: number) => (
                <div key={index} className="bg-sky-50 rounded-xl p-6 border border-sky-100">
                  <div className="flex items-start space-x-4">
                    {endorsement.endorserProfileImage ? (
                      <img 
                        src={endorsement.endorserProfileImage} 
                        alt={endorsement.endorserName} 
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-sky-200 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-navy-800 text-sm">
                          {endorsement.endorserName?.charAt(0) || 'E'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          {endorsement.endorserLinkedIn ? (
                            <a 
                              href={endorsement.endorserLinkedIn}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-navy-900 hover:text-navy-700 transition-colors flex items-center gap-2"
                            >
                              <span>{endorsement.endorserName || 'Anonymous'}</span>
                              <i className="fa-brands fa-linkedin text-[#0077B5] text-lg"></i>
                            </a>
                          ) : (
                            <h3 className="font-bold text-navy-900">{endorsement.endorserName || 'Anonymous'}</h3>
                          )}
                          {endorsement.endorserTitle && (
                            <p className="text-sm text-slate-600 font-medium">{endorsement.endorserTitle}</p>
                          )}
                          {endorsement.endorserCompany && (
                            <p className="text-sm text-slate-600">{endorsement.endorserCompany}</p>
                          )}
                        </div>
                        {endorsement.createdAt && (
                          <span className="text-sm text-slate-500">
                            {new Date(endorsement.createdAt.seconds * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {endorsement.skill && (
                        <div className="mb-3">
                          <span className="inline-block px-3 py-1 bg-sky-100 text-navy-900 rounded-full text-sm font-medium">
                            <i className="fa-solid fa-star text-yellow-500 mr-1"></i>
                            {endorsement.skill}
                          </span>
                        </div>
                      )}
                      {endorsement.message && (
                        <p className="text-slate-600 leading-relaxed italic border-l-4 border-sky-200 pl-4">
                          "{endorsement.message}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Get in Touch Card */}
        {user?.uid !== candidate.id && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-2">Get in Touch</h2>
                <p className="text-slate-600">Ready to connect? Send {candidate.firstName || 'this candidate'} a message to start the conversation.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleOpenMessageDialog}
                  className="bg-navy-800 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Message {candidate.firstName || 'Candidate'}</span>
                </button>
                <button
                  onClick={handleSaveCandidate}
                  disabled={isSaving}
                  className={`bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 ${
                    isSaved ? "text-navy-800 border-sky-600 bg-sky-50" : ""
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                  <span>Save Candidate</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  {copyLinkSuccess ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  <span className="hidden sm:inline">Copy profile link</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Message Compose Dialog */}
      {showMessageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-navy-900 mb-6">Send Message to {candidate?.firstName || 'Candidate'}</h3>

            {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
              <div className="mb-4 space-y-2">
                {suggestedTemplate && (
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(suggestedTemplate)}
                    className="w-full rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-left text-xs font-semibold text-navy-900 hover:bg-sky-100"
                  >
                    Suggested message: {suggestedTemplate.name}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-xs text-navy-900"
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
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Apply
                  </button>
                </div>
                {selectedTemplate && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Preview</p>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{formatTemplatePreview(selectedTemplate)}</pre>
                  </div>
                )}
              </div>
            )}

            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type your message here..."
              className="w-full p-4 border border-slate-200 rounded-lg mb-4 h-32 resize-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400"
              disabled={isSendingMessage}
            />
            
            {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
              <div className="mb-6">
                <label htmlFor="jobSelect" className="block text-sm font-medium text-navy-900 mb-2">
                  Select Job Position:
                </label>
                <select
                  id="jobSelect"
                  value={selectedJobId || ''}
                  onChange={(e) => setSelectedJobId(e.target.value || null)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900"
                  disabled={isSendingMessage}
                >
                  <option value="">Select a job</option>
                  {employerJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
              <div className="mb-4 grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Save current text as template..."
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-xs text-navy-900"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={templateSaving || !templateName.trim() || !messageContent.trim()}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Save template
                  </button>
                  <Link
                    href={getEmployerTemplatesUrl()}
                    className="text-xs font-semibold text-sky-700 hover:underline self-center"
                  >
                    Manage templates
                  </Link>
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-900 mb-1">
                    Outreach sequence · {SEQUENCE_ASSISTANT_MODE_LABEL}
                  </p>
                  <p className="text-[11px] text-navy-900/85 mb-2 leading-snug">
                    {describeSequenceAssistantState(sequence)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleStartSequence}
                      disabled={sequenceBusy || !selectedJobId}
                      className="px-2 py-1 rounded-md border border-sky-200 bg-white text-xs font-semibold text-navy-900 hover:bg-sky-100 disabled:opacity-60"
                    >
                      Start sequence
                    </button>
                    <button
                      type="button"
                      onClick={handleStopSequence}
                      disabled={sequenceBusy || !selectedJobId || sequence?.status !== 'ACTIVE'}
                      className="px-2 py-1 rounded-md border border-sky-200 bg-white text-xs font-semibold text-navy-900 hover:bg-sky-100 disabled:opacity-60"
                    >
                      Stop
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-900">Interview scheduling</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInterview(null);
                        setShowScheduleInterviewModal(true);
                      }}
                      disabled={!selectedJobId}
                      className="px-2 py-1 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Schedule interview
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMessageDialog(false);
                  setMessageContent('');
                  setSelectedJobId('');
                }}
                className="px-6 py-2.5 text-slate-600 hover:text-navy-900 transition-colors font-medium"
                disabled={isSendingMessage}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || isSendingMessage}
                className="px-6 py-2.5 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {candidate?.id && (selectedJobId || jobIdFromContext) && (
        <ScheduleInterviewModal
          isOpen={showScheduleInterviewModal}
          onClose={() => setShowScheduleInterviewModal(false)}
          jobId={(selectedJobId || jobIdFromContext) as string}
          candidateId={candidate.id}
          candidateName={candidateName}
          existingInterview={editingInterview}
          onSaved={(iv) => {
            setInterviewEvents((prev) => {
              const next = prev.filter((x) => x.id !== iv.id);
              next.push(iv);
              return next.sort((a, b) => {
                const aTime = new Date((a.scheduledAt as any)?.toDate ? (a.scheduledAt as any).toDate() : (a.scheduledAt as any) || 0).getTime();
                const bTime = new Date((b.scheduledAt as any)?.toDate ? (b.scheduledAt as any).toDate() : (b.scheduledAt as any) || 0).getTime();
                return aTime - bTime;
              });
            });
            setInterviewEvent(iv);
          }}
        />
      )}

      {/* Resume Modal */}
      {showResumeModal && candidate.resumeUrl && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-5xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-navy-900">
                {candidate.firstName}'s Resume
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={candidate.resumeUrl}
                  onClick={handleDownloadResume}
                  className="px-4 py-2 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Download Resume
                </a>
                <button
                  onClick={() => {
                    setShowResumeModal(false);
                    setResumePreviewError(false);
                    setUseGoogleViewer(false);
                    setZoomLevel(100); // Reset zoom when closing
                    setIsResumeLoading(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Modal Body - Resume Preview */}
            <div className="flex-1 overflow-hidden p-4 bg-slate-50 flex flex-col">
              {/* Zoom Controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Zoom Out"
                    disabled={zoomLevel <= 50}
                  >
                    <ZoomOut className="h-4 w-4 text-slate-600" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(300, prev + 25))}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Zoom In"
                    disabled={zoomLevel >= 300}
                  >
                    <ZoomIn className="h-4 w-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors ml-2"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>
              
              {/* Resume Container with Zoom */}
              <div 
                ref={resumeContainerRef}
                className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200"
                style={{ 
                  touchAction: 'pan-x pan-y pinch-zoom',
                  WebkitOverflowScrolling: 'touch',
                  position: 'relative',
                }}
              >
                {isResumeLoading && !resumePreviewError ? (
                  <div className="w-full h-full flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-navy-800 mx-auto mb-4" />
                      <p className="text-slate-600">Loading resume preview...</p>
                    </div>
                  </div>
                ) : !resumePreviewError ? (
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top left',
                      width: `${100 / (zoomLevel / 100)}%`,
                      height: `${100 / (zoomLevel / 100)}%`,
                      transition: 'transform 0.2s ease-out',
                    }}
                  >
                    {useGoogleViewer ? (
                      // Fallback: Google Docs Viewer
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(candidate.resumeUrl)}&embedded=true`}
                        className="w-full h-full border-0 rounded-lg"
                        title="Resume Preview"
                        frameBorder="0"
                        allowFullScreen
                        style={{
                          minHeight: '800px',
                          display: 'block',
                        }}
                        onError={() => {
                          setResumePreviewError(true);
                          setIsResumeLoading(false);
                        }}
                        onLoad={() => {
                          setIsResumeLoading(false);
                        }}
                      />
                    ) : (
                      // Primary: Use object tag for PDFs (most reliable across browsers)
                      <object
                        data={`${candidate.resumeUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-width`}
                        type="application/pdf"
                        className="w-full h-full border-0 rounded-lg"
                        style={{
                          minHeight: '800px',
                          display: 'block',
                        }}
                        onError={() => {
                          // If object fails, try Google Viewer
                          setUseGoogleViewer(true);
                        }}
                        onLoad={() => {
                          setIsResumeLoading(false);
                        }}
                      >
                        {/* Fallback content if object doesn't load */}
                        <iframe
                          src={candidate.resumeUrl}
                          className="w-full h-full border-0 rounded-lg"
                          title="Resume Preview"
                          frameBorder="0"
                          allowFullScreen
                          style={{
                            minHeight: '800px',
                            display: 'block',
                          }}
                          onError={() => {
                            setUseGoogleViewer(true);
                          }}
                          onLoad={() => {
                            setIsResumeLoading(false);
                          }}
                        />
                      </object>
                    )}
                  </div>
                ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-lg border-2 border-dashed border-slate-200">
                  <FileText className="h-16 w-16 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">Resume Preview Unavailable</h3>
                  <p className="text-sm text-slate-600 mb-6 text-center max-w-md">
                    The resume preview couldn't be loaded due to browser security restrictions. Use the options below to view or download the resume.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Open in New Tab
                    </a>
                    <a
                      href={candidate.resumeUrl}
                      onClick={handleDownloadResume}
                      className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      Download Resume
                    </a>
                  </div>
                  <button
                    onClick={async () => {
                      setResumePreviewError(false);
                      setUseGoogleViewer(false);
                      setZoomLevel(100); // Reset zoom when retrying
                      setIsResumeLoading(true);
                      
                      // Verify PDF is accessible
                      try {
                        const response = await fetch(candidate.resumeUrl, { method: 'HEAD' });
                        if (!response.ok) {
                          setResumePreviewError(true);
                        }
                      } catch (error) {
                        console.error('Error checking resume accessibility:', error);
                      } finally {
                        setIsResumeLoading(false);
                      }
                    }}
                    className="mt-3 text-sm text-sky-800 hover:text-navy-900 underline"
                  >
                    Try Preview Again
                  </button>
                </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-slate-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-600">
                  Tip: Use zoom controls above or pinch-to-zoom to view the resume in detail
                </p>
                <button
                  onClick={() => {
                    setShowResumeModal(false);
                    setResumePreviewError(false);
                    setUseGoogleViewer(false);
                    setZoomLevel(100); // Reset zoom when closing
                    setIsResumeLoading(false);
                  }}
                  className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}