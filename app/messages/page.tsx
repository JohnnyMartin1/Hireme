"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, MessageSquare, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { getUserMessageThreads, getDocument } from '@/lib/firebase-firestore';
import Link from 'next/link';

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
}

export default function MessagesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadWithParticipants[]>([]);
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
        
        // Fetch other participant info for each thread in parallel
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
            
            return {
              thread: thread as any as MessageThread,
              otherParticipant
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
  }, [user]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Determine dashboard URL based on role
  const dashboardUrl = profile.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : '/home/employer';

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={dashboardUrl}
            className="text-blue-600 hover:underline flex items-center space-x-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">Your conversations with candidates and employers</p>
        </div>

        {/* Threads List */}
        <div className="space-y-4">
          {threads.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-500 mb-6">
                Start connecting with candidates or employers to begin conversations
              </p>
              <Link
                href="/search/candidates"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                Find Candidates
              </Link>
            </div>
          ) : (
            threads.map(({ thread, otherParticipant }) => (
              <Link
                key={thread.id}
                href={`/messages/${thread.id}`}
                className="block bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {otherParticipant 
                          ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || 'Unknown User'
                          : 'Unknown User'
                        }
                      </h3>
                      <p className="text-sm text-gray-600">
                        {otherParticipant?.headline || otherParticipant?.role || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last activity: {thread.lastMessageAt ? new Date(thread.lastMessageAt.toDate ? thread.lastMessageAt.toDate() : thread.lastMessageAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}