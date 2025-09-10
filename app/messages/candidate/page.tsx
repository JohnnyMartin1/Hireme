"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, MessageSquare, ArrowRight, Loader2, Bell, CheckCircle } from "lucide-react";
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

export default function CandidateMessagesPage() {
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
  }, [user, loading, router]);

  useEffect(() => {
    const fetchThreads = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching message threads for candidate:', user.uid);
        const { data: threadsData, error: threadsError } = await getUserMessageThreads(user.uid);
        
        if (threadsError) {
          console.error('Error fetching threads:', threadsError);
          setError(`Failed to load message threads: ${threadsError}`);
          return;
        }
        
        if (!threadsData || threadsData.length === 0) {
          setThreads([]);
          return;
        }
        
        // Fetch other participant info for each thread
        const threadsWithParticipants = await Promise.all(
          threadsData.map(async (threadData) => {
            const thread = threadData as MessageThread;
            const otherId = thread.participantIds.find(id => id !== user.uid);
            let otherParticipant = null;
            
            if (otherId) {
              const { data: otherProfile, error: profileError } = await getDocument('users', otherId);
              if (profileError) {
                console.error('Error fetching participant profile:', profileError);
              }
              otherParticipant = otherProfile;
            }
            
            return {
              thread,
              otherParticipant
            };
          })
        );
        
        setThreads(threadsWithParticipants);
        
      } catch (err) {
        console.error('Error in fetchThreads:', err);
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">Your conversations with employers</p>
        </div>

        {/* Message Requests Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-orange-500" />
            Message Requests
          </h2>
          <div className="space-y-4">
            {threads.filter(t => !t.thread.lastMessageAt).length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No new message requests</p>
              </div>
            ) : (
              threads
                .filter(t => !t.thread.lastMessageAt)
                .map(({ thread, otherParticipant }) => (
                  <Link
                    key={thread.id}
                    href={`/messages/${thread.id}`}
                    className="block bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-orange-500"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {otherParticipant 
                              ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || 'Unknown Employer'
                              : 'Unknown Employer'
                            }
                          </h3>
                          <p className="text-sm text-gray-600">
                            {otherParticipant?.companyName || otherParticipant?.role || 'Employer'}
                          </p>
                          <p className="text-xs text-orange-600 font-medium">New message request</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                ))
            )}
          </div>
        </div>

        {/* Active Conversations Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            Active Conversations
          </h2>
          <div className="space-y-4">
            {threads.filter(t => t.thread.lastMessageAt).length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active conversations yet</p>
              </div>
            ) : (
              threads
                .filter(t => t.thread.lastMessageAt)
                .map(({ thread, otherParticipant }) => (
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
                              ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() || 'Unknown Employer'
                              : 'Unknown Employer'
                            }
                          </h3>
                          <p className="text-sm text-gray-600">
                            {otherParticipant?.companyName || otherParticipant?.role || 'Employer'}
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

        {/* Empty State */}
        {threads.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500 mb-6">
              Employers will reach out when they find your profile
            </p>
            <Link
              href="/account/profile"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <User className="h-4 w-4 mr-2" />
              Complete Your Profile
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
