"use client";
import { useParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { User, MessageSquare, Send, ArrowLeft, Loader2, Star } from "lucide-react";
import { getMessageThread, getThreadMessages, sendMessage, getDocument, createCompanyRating } from '@/lib/firebase-firestore';
import Link from 'next/link';
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
}

export default function MessageThreadPage() {
  const params = useParams();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      } catch (err) {
        setError(`Failed to load thread: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreadData();
  }, [params.threadId, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !thread || !user || !profile) return;

    setIsSending(true);
    try {
      const messageData = {
        senderId: user.uid,
        senderName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User',
        content: newMessage.trim()
      };

      const { error: messageError } = await sendMessage(thread.id, messageData);
      
      if (messageError) {
        console.error('Error sending message:', messageError);
        setError('Failed to send message');
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
      
      // Refresh messages to get the real message from Firebase
      setTimeout(async () => {
        const { data: refreshedMessages } = await getThreadMessages(thread.id);
        if (refreshedMessages) {
          setMessages(refreshedMessages as Message[]);
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

  // Determine messages page and dashboard URL based on role
  const messagesPageUrl = profile?.role === 'JOB_SEEKER' ? '/messages/candidate' : '/messages';
  const dashboardUrl = profile?.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : '/home/employer';

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
            href={messagesPageUrl} 
            className="text-sky-600 hover:text-navy-800 underline"
          >
            Back to messages
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

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href={messagesPageUrl}
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm hidden sm:inline">Back to Messages</span>
            <span className="font-medium text-sm sm:hidden">Back</span>
          </Link>
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 w-full">
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
                            href={`/job/${message.jobDetails.jobId}`}
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