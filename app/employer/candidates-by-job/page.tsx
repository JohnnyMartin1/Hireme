"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { User, MessageSquare, ArrowLeft, Loader2, Calendar, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import {
  getCompanyJobs,
  getDocument,
  getEmployerJobs,
  getPipelineByJob,
  getRecruiterNotes,
  getUserMessageThreads,
  normalizePipelineStage,
} from "@/lib/firebase-firestore";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';
import { getCandidateUrl, getCandidatesSearchUrl, getJobCompareUrl, getJobPipelineUrl } from "@/lib/navigation";

interface ContactedCandidate {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  skills: string[];
  threadId: string;
  lastMessageAt: any;
  school?: string;
  major?: string;
  jobId?: string;
  stage?: string;
  noteCount?: number;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  employment?: string;
  candidates: ContactedCandidate[];
  isExpanded: boolean;
  pipelineCount: number;
  shortlistCount: number;
}

export default function CandidatesByJobPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalCandidates = useMemo(() => jobs.reduce((sum, job) => sum + job.candidates.length, 0), [jobs]);
  const jobsWithShortlist = useMemo(() => jobs.filter((job) => job.shortlistCount > 0).length, [jobs]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Check if user has the correct role
    if (profile && profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
      if (profile.role === 'JOB_SEEKER') {
        router.push("/home/seeker");
      } else {
        router.push("/admin");
      }
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const fetchJobsAndCandidates = async () => {
      if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const { data: jobsData, error: jobsError } = profile.companyId 
          ? await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false)
          : await getEmployerJobs(user.uid);
        
        if (jobsError) {
          console.error('Error fetching jobs:', jobsError);
          setError('Failed to load jobs');
          return;
        }

        if (!jobsData || jobsData.length === 0) {
          setJobs([]);
          return;
        }

        // Get all message threads for this user
        const { data: threads, error: threadsError } = await getUserMessageThreads(user.uid);
        
        if (threadsError) {
          console.error('Error fetching threads:', threadsError);
          setError('Failed to load contacted candidates');
          return;
        }

        const pipelineByJob = new Map<string, Map<string, { stage: string }>>();
        const pipelineCountByJob = new Map<string, number>();
        const shortlistCountByJob = new Map<string, number>();
        await Promise.all(
          (jobsData as any[]).map(async (job: any) => {
            const { data: entries } = await getPipelineByJob(job.id);
            const perCandidate = new Map<string, { stage: string }>();
            let shortlistCount = 0;
            for (const entry of entries || []) {
              const stage = normalizePipelineStage((entry as any).stage);
              perCandidate.set(String((entry as any).candidateId), { stage });
              if (stage === "SHORTLIST") shortlistCount += 1;
            }
            pipelineByJob.set(job.id, perCandidate);
            pipelineCountByJob.set(job.id, (entries || []).length);
            shortlistCountByJob.set(job.id, shortlistCount);
          })
        );

        const jobCandidatesMap = new Map<string, ContactedCandidate[]>();
        
        if (threads && threads.length > 0) {
          for (const thread of threads) {
            const threadData = thread as any;
            
            // Find the other participant (the candidate)
            const otherParticipantId = threadData.participantIds?.find((id: string) => id !== user.uid);
            
            if (otherParticipantId) {
              try {
                const { data: candidateProfile } = await getDocument('users', otherParticipantId);
                
                // Only process if this is a candidate
                if (candidateProfile && (candidateProfile as any).role === 'JOB_SEEKER') {
                  // Fetch messages for this thread to find the job ID
                  const messagesQuery = query(
                    collection(db, 'messages'),
                    where('threadId', '==', thread.id),
                    limit(10)
                  );
                  
                  const messagesSnapshot = await getDocs(messagesQuery);
                  let jobId = null;
                  
                  // Look through messages to find one with jobDetails
                  for (const msgDoc of messagesSnapshot.docs) {
                    const msgData = msgDoc.data();
                    if (msgData.jobDetails && msgData.jobDetails.jobId) {
                      jobId = msgData.jobDetails.jobId;
                      break;
                    }
                  }
                  
                  if (jobId) {
                    const pipelineMeta = pipelineByJob.get(jobId)?.get(otherParticipantId);
                    const { data: notes } = await getRecruiterNotes(jobId, otherParticipantId);
                    const candidate: ContactedCandidate = {
                      id: otherParticipantId,
                      firstName: (candidateProfile as any).firstName || '',
                      lastName: (candidateProfile as any).lastName || '',
                      headline: (candidateProfile as any).headline || 'Job Seeker',
                      skills: (candidateProfile as any).skills || [],
                      threadId: thread.id,
                      lastMessageAt: threadData.lastMessageAt,
                      school: (candidateProfile as any).school,
                      major: (candidateProfile as any).major,
                      jobId: jobId,
                      stage: pipelineMeta?.stage || "NOT_IN_PIPELINE",
                      noteCount: (notes || []).length,
                    };
                    
                    if (!jobCandidatesMap.has(jobId)) {
                      jobCandidatesMap.set(jobId, []);
                    }
                    jobCandidatesMap.get(jobId)?.push(candidate);
                  }
                }
              } catch (error) {
                console.warn('Could not fetch candidate profile or messages:', otherParticipantId);
              }
            }
          }
        }

        // Build the jobs array with candidates
        const jobsWithCandidates: Job[] = (jobsData as any[]).map((job: any) => {
          const candidates = jobCandidatesMap.get(job.id) || [];
          
          // Sort candidates by most recent message
          candidates.sort((a, b) => {
            const aTime = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate() : a.lastMessageAt;
            const bTime = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate() : b.lastMessageAt;
            
            if (!aTime && !bTime) return 0;
            if (!aTime) return 1;
            if (!bTime) return -1;
            
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });

          return {
            id: job.id,
            title: job.title,
            company: job.company || profile.companyName || 'Your Company',
            location: job.locationCity && job.locationState 
              ? `${job.locationCity}, ${job.locationState}` 
              : job.location || 'Remote',
            employment: job.employment || 'Full-time',
            candidates: candidates,
            isExpanded: false,
            pipelineCount: pipelineCountByJob.get(job.id) || 0,
            shortlistCount: shortlistCountByJob.get(job.id) || 0,
          };
        });

        setJobs(jobsWithCandidates);
      } catch (err) {
        console.error('Error fetching jobs and candidates:', err);
        setError('Failed to load jobs and candidates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobsAndCandidates();
  }, [user, profile]);

  const toggleJobExpansion = (jobId: string) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, isExpanded: !job.isExpanded } : job
      )
    );
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-navy-700 mx-auto mb-4" />
          <p className="text-slate-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/home/employer"
            className="text-navy-800 hover:underline flex items-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-8">
        <section className="mb-5">
          <Link
            href="/home/employer"
            className="inline-flex items-center gap-2 text-navy-800 hover:text-navy-700 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Workflow view</p>
          <h1 className="text-2xl font-bold text-navy-900">Contacted Candidates by Requisition</h1>
          <p className="text-sm text-slate-600 mt-1">
            Everyone you have messaged about a job — not the same as pipeline (pipeline is all active candidates you are tracking for the req).
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 font-semibold">
              Contacted candidates: {totalCandidates}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-900 font-semibold">
              Jobs with shortlist: {jobsWithShortlist}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 font-semibold">
              Requisitions: {jobs.length}
            </span>
          </div>
        </section>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No requisitions yet</h3>
              <p className="text-slate-500 mb-6">Create a job posting to start sourcing and outreach.</p>
              <Link
                href="/employer/job/new"
                className="inline-flex items-center px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
              >
                Post New Job
              </Link>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Job Header - Clickable */}
                <button
                  onClick={() => toggleJobExpansion(job.id)}
                  className="w-full p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-sky-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-sky-700" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                          <span>{job.company}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>{job.employment}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700">
                            Contacted: {job.candidates.length}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700">
                            Pipeline: {job.pipelineCount}
                          </span>
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-semibold text-sky-900">
                            Shortlist: {job.shortlistCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/employer/job/${job.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 text-navy-800 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors text-sm font-medium"
                      >
                        View Job
                      </Link>
                      {job.isExpanded ? (
                        <ChevronUp className="h-6 w-6 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Candidates List - Expandable */}
                {job.isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Link href={getJobPipelineUrl(job.id)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-navy-800 hover:bg-slate-100">
                        Open pipeline
                      </Link>
                      <Link href={getCandidatesSearchUrl(job.id)} className="px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                        Continue sourcing
                      </Link>
                      <Link href={getJobCompareUrl(job.id)} className="px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-900 hover:bg-sky-100">
                        Compare contenders
                      </Link>
                    </div>
                    {job.candidates.length === 0 ? (
                      <div className="text-center py-8">
                        <User className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600">No candidates contacted for this job yet</p>
                        <Link
                          href={getCandidatesSearchUrl(job.id)}
                          className="inline-block mt-4 text-sky-700 hover:underline font-medium"
                        >
                          Source candidates for this job
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {job.candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-sky-700" />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-semibold text-slate-900">
                                      {candidate.firstName} {candidate.lastName}
                                    </h4>
                                    <p className="text-sm text-slate-600">{candidate.headline}</p>
                                  </div>
                                </div>
                                
                                {candidate.school && candidate.major && (
                                  <div className="mb-2">
                                    <p className="text-xs text-slate-600">
                                      <span className="font-medium text-slate-500">Education:</span>{" "}
                                      {candidate.school} — {candidate.major}
                                    </p>
                                  </div>
                                )}
                                
                                {candidate.skills && candidate.skills.length > 0 && (
                                  <div className="mb-2">
                                    <div className="flex flex-wrap gap-1">
                                      {candidate.skills.slice(0, 4).map((skill, index) => (
                                        <span
                                          key={index}
                                          className="px-2 py-0.5 bg-sky-100 text-sky-900 text-xs rounded-full"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                      {candidate.skills.length > 4 && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                                          +{candidate.skills.length - 4}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>
                                    Last message: {candidate.lastMessageAt ? 
                                      new Date(candidate.lastMessageAt.toDate ? candidate.lastMessageAt.toDate() : candidate.lastMessageAt).toLocaleDateString() : 
                                      'Recently'}
                                  </span>
                                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${
                                    candidate.stage === "SHORTLIST"
                                      ? "border-sky-200 bg-sky-50 text-sky-900"
                                      : candidate.stage && candidate.stage !== "NOT_IN_PIPELINE"
                                        ? "border-slate-200 bg-slate-100 text-slate-800"
                                        : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}>
                                    {candidate.stage === "NOT_IN_PIPELINE" ? "Not in pipeline" : `Stage: ${candidate.stage}`}
                                  </span>
                                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${
                                    (candidate.noteCount || 0) > 0
                                      ? "border-sky-200 bg-sky-50 text-sky-900"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}>
                                    {(candidate.noteCount || 0) > 0 ? `${candidate.noteCount} note${candidate.noteCount === 1 ? "" : "s"}` : "No notes"}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Link
                                  href={getCandidateUrl(candidate.id, job.id)}
                                  className="px-3 py-2 text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors text-sm font-medium"
                                >
                                  View Profile
                                </Link>
                                <Link
                                  href={`/messages/${candidate.threadId}?jobId=${encodeURIComponent(job.id)}`}
                                  className="px-3 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium flex items-center"
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Message
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

