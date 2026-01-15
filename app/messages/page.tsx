"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User, MessageSquare, ArrowRight, Loader2, ArrowLeft, Filter, Briefcase, X } from "lucide-react";
import { getUserMessageThreads, getDocument, getThreadMessages, getEmployerJobs, getCompanyJobs } from '@/lib/firebase-firestore';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';

interface MessageThread {
  id: string;
  participantIds: string[];
  createdAt: any;
  updatedAt: any;
  lastMessageAt: any;
}

interface ThreadWithParticipants {
  thread: MessageThread;
  otherParticipant: any;
  lastMessage?: any;
  jobId?: string;
  jobTitle?: string;
}

interface Job {
  id: string;
  title: string;
  [key: string]: any;
}

export default function MessagesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadWithParticipants[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const { data: threadsData, error: threadsError } = await getUserMessageThreads(user.uid);
        
        if (threadsError) {
          setError(`Failed to load message threads: ${threadsError}`);
          return;
        }
        
        if (!threadsData || threadsData.length === 0) {
          setThreads([]);
          return;
        }
        
        // Fetch other participant info and job associations for each thread
        const threadsWithParticipants = await Promise.all(
          (threadsData as any[]).map(async (thread: any) => {
            const otherId = Array.isArray(thread.participantIds)
              ? (thread.participantIds as string[]).find((id) => id !== user.uid)
              : undefined;
            let otherParticipant = null;
            
            if (otherId) {
              const { data: otherProfile } = await getDocument('users', otherId);
              otherParticipant = otherProfile;
            }
            
            // Check messages for job association (only for employers/recruiters)
            let jobId: string | undefined = undefined;
            let jobTitle: string | undefined = undefined;
            
            if (profile && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER')) {
              try {
                // Fetch a few messages to check for jobDetails
                const messagesQuery = query(
                  collection(db, 'messages'),
                  where('threadId', '==', thread.id),
                  firestoreLimit(10)
                );
                
                const messagesSnapshot = await getDocs(messagesQuery);
                
                // Find first message with jobDetails
                for (const msgDoc of messagesSnapshot.docs) {
                  const msgData = msgDoc.data();
                  if (msgData.jobDetails && msgData.jobDetails.jobId) {
                    jobId = msgData.jobDetails.jobId;
                    jobTitle = msgData.jobDetails.jobTitle;
                    break;
                  }
                }
              } catch (err) {
                console.error('Error checking messages for job:', err);
              }
            }
            
            return {
              thread: thread as any as MessageThread,
              otherParticipant,
              jobId,
              jobTitle
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
  }, [user, profile]);

  // Filter threads based on selected job
  const filteredThreads = useMemo(() => {
    if (selectedJobId === 'all') {
      return threads;
    }
    return threads.filter(thread => thread.jobId === selectedJobId);
  }, [threads, selectedJobId]);

  // Determine dashboard URL based on role
  const dashboardUrl = profile?.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : '/home/employer';

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

  // Only show job filter for employers/recruiters
  const showJobFilter = (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && jobs.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href={dashboardUrl}
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm hidden sm:inline">Back to Dashboard</span>
            <span className="font-medium text-sm sm:hidden">Back</span>
          </Link>
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Messages</h1>
          <p className="text-slate-600">Your conversations with candidates and employers</p>
        </div>

        {/* Job Filter - Only show for employers/recruiters */}
        {showJobFilter && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-semibold text-navy-900">Filter by job:</span>
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
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Threads List */}
        <div className="space-y-4">
          {filteredThreads.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
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
                  View All Messages
                </button>
              )}
              {selectedJobId === 'all' && (
                <Link
                  href="/search/candidates"
                  className="inline-flex items-center px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
                >
                  <User className="h-4 w-4 mr-2" />
                  Find Candidates
                </Link>
              )}
            </div>
          ) : (
            filteredThreads.map(({ thread, otherParticipant, jobTitle }) => (
              <Link
                key={thread.id}
                href={`/messages/${thread.id}`}
                className="block bg-white rounded-2xl shadow-xl border border-slate-100 p-6 hover:shadow-2xl hover:border-sky-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-sky-50 rounded-full flex items-center justify-center flex-shrink-0">
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
                      </div>
                      <p className="text-sm text-slate-600">
                        {otherParticipant?.headline || otherParticipant?.role || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Last activity: {thread.lastMessageAt ? new Date(thread.lastMessageAt.toDate ? thread.lastMessageAt.toDate() : thread.lastMessageAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}