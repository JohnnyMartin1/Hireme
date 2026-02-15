"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { 
  getDocument,
  getUserMessageThreads,
  getEmployerJobs
} from '@/lib/firebase-firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ArrowLeft, User, Briefcase, ChevronDown, ChevronUp, MessageSquare, Calendar } from 'lucide-react';
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
}

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  employment?: string;
  candidates: ContactedCandidate[];
  isExpanded: boolean;
  createdAt: any;
}

export default function RecruiterDetailPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const params = useParams();
  const recruiterId = params.id as string;
  
  const [recruiter, setRecruiter] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    // Only company owners can view this
    if (profile && !profile.isCompanyOwner) {
      router.push('/home/employer');
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const loadRecruiterActivity = async () => {
      if (!user || !profile?.isCompanyOwner || !recruiterId) return;

      setIsLoading(true);
      try {
        // Fetch recruiter profile
        const { data: recruiterData, error: recruiterError } = await getDocument('users', recruiterId);
        
        if (recruiterError || !recruiterData) {
          setError('Failed to load recruiter profile');
          return;
        }

        // Verify this recruiter belongs to the company
        if ((recruiterData as any).companyId !== profile.companyId) {
          setError('This recruiter does not belong to your company');
          return;
        }

        setRecruiter(recruiterData);

        // Fetch jobs posted by this recruiter
        const { data: jobsData, error: jobsError } = await getEmployerJobs(recruiterId);
        
        if (jobsError || !jobsData) {
          setJobs([]);
          return;
        }

        // Get all message threads for this recruiter
        const { data: threads, error: threadsError } = await getUserMessageThreads(recruiterId);
        
        if (threadsError || !threads) {
          // No threads, just show jobs without candidates
          const jobsWithoutCandidates: Job[] = (jobsData as any[]).map((job: any) => ({
            id: job.id,
            title: job.title,
            company: job.company || profile.companyName || 'Your Company',
            location: job.locationCity && job.locationState 
              ? `${job.locationCity}, ${job.locationState}` 
              : job.location || 'Remote',
            employment: job.employment || 'Full-time',
            candidates: [],
            isExpanded: false,
            createdAt: job.createdAt
          }));
          setJobs(jobsWithoutCandidates);
          return;
        }

        // Create a map of job IDs to contacted candidates
        const jobCandidatesMap = new Map<string, ContactedCandidate[]>();
        
        if (threads && threads.length > 0) {
          // Batch process all threads in parallel
          const candidatePromises = threads.map(async (thread) => {
            const threadData = thread as any;
            
            // Find the other participant (the candidate)
            const otherParticipantId = threadData.participantIds?.find((id: string) => id !== recruiterId);
            
            if (!otherParticipantId) return null;
            
            try {
              // Fetch candidate profile and messages in parallel
              const [candidateResult, messagesSnapshot] = await Promise.all([
                getDocument('users', otherParticipantId),
                getDocs(query(
                  collection(db, 'messages'),
                  where('threadId', '==', thread.id),
                  limit(5)
                ))
              ]);
              
              const candidateProfile = candidateResult.data;
              
              // Only process if this is a candidate
              if (!candidateProfile || (candidateProfile as any).role !== 'JOB_SEEKER') {
                return null;
              }
              
              // Look through messages to find one with jobDetails
              let jobId = null;
              for (const msgDoc of messagesSnapshot.docs) {
                const msgData = msgDoc.data();
                if (msgData.jobDetails?.jobId) {
                  jobId = msgData.jobDetails.jobId;
                  break;
                }
              }
              
              // Only include candidates that have a job association
              if (!jobId) return null;
              
              return {
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
            } catch (error) {
              console.warn('Could not fetch candidate profile or messages:', otherParticipantId);
              return null;
            }
          });
          
          // Wait for all candidates to be processed
          const candidateResults = await Promise.all(candidatePromises);
          
          // Group candidates by job ID
          for (const candidate of candidateResults) {
            if (candidate) {
              if (!jobCandidatesMap.has(candidate.jobId)) {
                jobCandidatesMap.set(candidate.jobId, []);
              }
              jobCandidatesMap.get(candidate.jobId)?.push(candidate);
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
            createdAt: job.createdAt
          };
        });

        setJobs(jobsWithCandidates);
      } catch (err) {
        console.error('Error loading recruiter activity:', err);
        setError('Failed to load recruiter activity');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecruiterActivity();
  }, [user, profile, recruiterId, router]);

  const toggleJobExpansion = (jobId: string) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, isExpanded: !job.isExpanded } : job
      )
    );
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recruiter activity...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile?.isCompanyOwner) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/company/manage/recruiters"
            className="text-blue-600 hover:underline flex items-center justify-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Manage Recruiters</span>
          </Link>
        </div>
      </div>
    );
  }

  const totalCandidates = jobs.reduce((sum, job) => sum + job.candidates.length, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/company/manage/recruiters"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back to Manage Recruiters</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 p-6">
        {/* Recruiter Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          
          {/* Recruiter Profile */}
          <div className="flex items-center gap-4">
            {recruiter?.profileImageUrl ? (
              <img 
                src={recruiter.profileImageUrl} 
                alt={`${recruiter.firstName} ${recruiter.lastName}`}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-2xl">
                  {recruiter?.firstName?.[0]}{recruiter?.lastName?.[0]}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {recruiter?.firstName} {recruiter?.lastName}
              </h1>
              <p className="text-gray-600">{recruiter?.email}</p>
              <p className="text-sm text-gray-500 mt-1">Recruiter at {profile.companyName}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium text-gray-600">Jobs Posted</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{jobs.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-gray-600">Candidates Contacted</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCandidates}</p>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h3>
              <p className="text-gray-500">This recruiter hasn't posted any jobs</p>
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
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
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
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 mb-4">
                          Candidates contacted for this position:
                        </p>
                        {job.candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-purple-600" />
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
                                    Last contacted: {candidate.lastMessageAt ? 
                                      new Date(candidate.lastMessageAt.toDate ? candidate.lastMessageAt.toDate() : candidate.lastMessageAt).toLocaleDateString() : 
                                      'Recently'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Link
                                  href={`/candidate/${candidate.id}`}
                                  className="px-3 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                                >
                                  View Profile
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

