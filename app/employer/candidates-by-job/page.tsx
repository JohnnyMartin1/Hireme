"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, MessageSquare, ArrowLeft, Loader2, Calendar, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { getUserMessageThreads, getDocument, getEmployerJobs, getCompanyJobs } from '@/lib/firebase-firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';

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
}

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  employment?: string;
  candidates: ContactedCandidate[];
  isExpanded: boolean;
}

export default function CandidatesByJobPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      try {
        console.log('Fetching jobs and contacted candidates for employer:', user.uid);
        
        // Get all jobs for this employer
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

        // Create a map of job IDs to contacted candidates
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
                  
                  // Only include candidates that have a job association
                  if (jobId) {
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
                      jobId: jobId
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
            isExpanded: false
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/home/employer"
            className="text-blue-600 hover:underline flex items-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const totalCandidates = jobs.reduce((sum, job) => sum + job.candidates.length, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <Link 
            href="/home/employer"
            className="text-blue-600 hover:underline flex items-center space-x-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
              <p className="text-gray-600">
                {totalCandidates} candidate{totalCandidates !== 1 ? 's' : ''} contacted across {jobs.length} job{jobs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h3>
              <p className="text-gray-500 mb-6">Create a job posting to start reaching out to candidates</p>
              <Link
                href="/employer/job/new"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Post New Job
              </Link>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Job Header - Clickable */}
                <button
                  onClick={() => toggleJobExpansion(job.id)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{job.company}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>{job.employment}</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1 font-medium">
                          {job.candidates.length} candidate{job.candidates.length !== 1 ? 's' : ''} contacted
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/employer/job/${job.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        View Job
                      </Link>
                      {job.isExpanded ? (
                        <ChevronUp className="h-6 w-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Candidates List - Expandable */}
                {job.isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {job.candidates.length === 0 ? (
                      <div className="text-center py-8">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">No candidates contacted for this job yet</p>
                        <Link
                          href="/search/candidates"
                          className="inline-block mt-4 text-green-600 hover:underline font-medium"
                        >
                          Search Candidates
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {job.candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-semibold text-gray-900">
                                      {candidate.firstName} {candidate.lastName}
                                    </h4>
                                    <p className="text-sm text-gray-600">{candidate.headline}</p>
                                  </div>
                                </div>
                                
                                {candidate.school && candidate.major && (
                                  <div className="mb-2 ml-13">
                                    <p className="text-xs text-gray-600">
                                      🎓 {candidate.school} - {candidate.major}
                                    </p>
                                  </div>
                                )}
                                
                                {candidate.skills && candidate.skills.length > 0 && (
                                  <div className="mb-2 ml-13">
                                    <div className="flex flex-wrap gap-1">
                                      {candidate.skills.slice(0, 4).map((skill, index) => (
                                        <span
                                          key={index}
                                          className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                      {candidate.skills.length > 4 && (
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                          +{candidate.skills.length - 4}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex items-center text-xs text-gray-500 ml-13">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>
                                    Last message: {candidate.lastMessageAt ? 
                                      new Date(candidate.lastMessageAt.toDate ? candidate.lastMessageAt.toDate() : candidate.lastMessageAt).toLocaleDateString() : 
                                      'Recently'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Link
                                  href={`/candidate/${candidate.id}`}
                                  className="px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                >
                                  View Profile
                                </Link>
                                <Link
                                  href={`/messages/${candidate.threadId}`}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
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

