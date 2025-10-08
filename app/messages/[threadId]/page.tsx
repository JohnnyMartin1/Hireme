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

  const handleKeyPress = (e: React.KeyboardEvent) => {
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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
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
          <Link 
            href="/messages" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Thread not found</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-t-xl shadow-sm p-4 border-b">
          <div className="flex items-center gap-4">
            <Link 
              href="/messages"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {otherParticipant ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() : 'Unknown User'}
              </h1>
              <p className="text-sm text-gray-600">Message thread</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6">
          {/* Messages Section */}
          <div className="lg:col-span-2 bg-white rounded-b-xl shadow-lg flex flex-col" style={{ height: '70vh' }}>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col justify-end min-h-full">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user.uid
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {/* Job Details Banner */}
                        {message.jobDetails && (
                          <div className={`mb-2 p-2 rounded text-xs ${
                            message.senderId === user.uid
                              ? 'bg-blue-500 text-white'
                              : 'bg-green-100 text-green-800'
                          }`}
                          >
                            <Link 
                              href={`/job/${message.jobDetails.jobId}`}
                              className="block hover:opacity-80 transition-opacity"
                            >
                              <div className="font-semibold">📋 Job Position: {message.jobDetails.jobTitle}</div>
                              <div>💼 {message.jobDetails.employmentType}</div>
                              <div>📍 {message.jobDetails.location}</div>
                              <div className="mt-1 text-xs opacity-80">
                                {message.jobDetails.jobDescription.substring(0, 100)}
                                {message.jobDetails.jobDescription.length > 100 ? '...' : ''}
                              </div>
                              <div className="mt-1 text-xs font-medium">
                                👆 Click to view full job details
                              </div>
                            </Link>
                            
                            {/* Rate Company Button - Only show for candidates receiving job messages */}
                            {profile?.role === 'JOB_SEEKER' && message.senderId !== user.uid && (
                              <button
                                onClick={() => handleRateCompany(message)}
                                className="mt-2 w-full px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-colors flex items-center justify-center"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Rate Company Experience
                              </button>
                            )}
                          </div>
                        )}
                        
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === user.uid ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.createdAt ? new Date(message.createdAt.toDate ? message.createdAt.toDate() : message.createdAt).toLocaleTimeString() : 'Now'}
                        </p>
                      </div>
                    </div>
                  ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Message Input - Fixed at bottom */}
            <div className="border-t bg-gray-50 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Company Profile Sidebar - Only show for candidates */}
          {profile.role === 'JOB_SEEKER' && otherParticipant && (
            <div className="lg:col-span-1 hidden lg:block">
              <div className="bg-white rounded-xl shadow-lg overflow-y-auto" style={{ height: '70vh' }}>
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