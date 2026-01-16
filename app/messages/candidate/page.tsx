"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { User, MessageSquare, ArrowRight, Loader2, Bell, CheckCircle, ArrowLeft, Send, Search, MoreHorizontal, Eye, Star, Archive, Trash2, BellOff } from "lucide-react";
import { getUserMessageThreads, getDocument, getMessageThread, getThreadMessages, sendMessage, acceptMessageThread, updateDocument } from '@/lib/firebase-firestore';
import Link from 'next/link';

interface MessageThread {
  id: string;
  participantIds: string[];
  acceptedBy?: string[];
  archivedBy?: string[];
  mutedBy?: string[];
  createdAt: any;
  updatedAt: any;
  lastMessageAt: any;
}

interface ThreadWithParticipants {
  thread: MessageThread;
  otherParticipant: any;
  lastMessage?: any;
}

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

function CandidateMessagesPageContent() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<ThreadWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Conversation view state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadWithParticipants | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'archived' | 'starred'>('all');
  const [showRecruiterInfo, setShowRecruiterInfo] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'conversation'>('list');
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
        
        // Type assertion for thread data
        const typedThreadsData = threadsData as MessageThread[];
        
        // Fetch other participant info for each thread in parallel
        const threadsWithParticipants = await Promise.all(
          typedThreadsData.map(async (thread) => {
            const otherId = thread.participantIds.find(id => id !== user.uid);
            let otherParticipant = null;
            
            if (otherId) {
              const { data: otherProfile } = await getDocument('users', otherId);
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
        setError(`Failed to load message threads: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, [user]);

  // Auto-select thread from URL parameter
  useEffect(() => {
    const threadIdFromUrl = searchParams.get('thread');
    if (threadIdFromUrl && threads.length > 0 && !selectedThreadId) {
      const threadToSelect = threads.find(t => t.thread.id === threadIdFromUrl);
      if (threadToSelect) {
        handleThreadSelect(threadToSelect);
        setMobileView('conversation'); // Ensure mobile view switches to conversation
      }
    }
  }, [threads, searchParams, selectedThreadId]);

  // Handle thread selection
  const handleThreadSelect = async (thread: ThreadWithParticipants) => {
    setSelectedThreadId(thread.thread.id);
    setSelectedThread(thread);
    setMobileView('conversation'); // Switch to conversation view on mobile
    setShowConversationMenu(false); // Close menu when switching threads
    
    // Load messages for this thread
    try {
      const { data: messagesData, error: messagesError } = await getThreadMessages(thread.thread.id);
      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }
      setMessages((messagesData as Message[]) || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowConversationMenu(false);
      }
    };

    if (showConversationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConversationMenu]);

  // Handle conversation menu actions
  const handleArchiveConversation = async () => {
    if (!selectedThreadId || !user) return;
    
    try {
      // Get current thread data
      const { data: threadData } = await getMessageThread(selectedThreadId);
      if (!threadData) return;
      
      const thread = threadData as MessageThread;
      const archivedBy = thread.archivedBy || [];
      const isArchived = archivedBy.includes(user.uid);
      
      // Toggle archive state
      const updatedArchivedBy = isArchived
        ? archivedBy.filter((id: string) => id !== user.uid)
        : [...archivedBy, user.uid];
      
      // Update thread in Firestore
      const { error } = await updateDocument('messageThreads', selectedThreadId, {
        archivedBy: updatedArchivedBy
      });
      
      if (error) {
        console.error('Error archiving conversation:', error);
        alert('Failed to archive conversation. Please try again.');
        return;
      }
      
      // Update local state
      setThreads(prevThreads =>
        prevThreads.map(t =>
          t.thread.id === selectedThreadId
            ? { ...t, thread: { ...t.thread, archivedBy: updatedArchivedBy } }
            : t
        )
      );
      
      // If archived, close the conversation view
      if (!isArchived) {
        setSelectedThread(null);
        setSelectedThreadId(null);
        setMessages([]);
      }
      
      setShowConversationMenu(false);
    } catch (error) {
      console.error('Error archiving conversation:', error);
      alert('Failed to archive conversation. Please try again.');
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedThreadId) return;
    if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      // TODO: Implement delete functionality
      setShowConversationMenu(false);
      setSelectedThread(null);
      setSelectedThreadId(null);
      setMessages([]);
      // Refresh threads list
      if (user) {
        const { data: threadsData } = await getUserMessageThreads(user.uid);
        if (threadsData) {
          const threadsWithParticipants = await Promise.all(
            (threadsData as MessageThread[]).map(async (thread) => {
              const otherId = thread.participantIds.find(id => id !== user.uid);
              let otherParticipant = null;
              if (otherId) {
                const { data: otherProfile } = await getDocument('users', otherId);
                otherParticipant = otherProfile;
              }
              return { thread, otherParticipant };
            })
          );
          setThreads(threadsWithParticipants);
        }
      }
    }
  };

  const handleMuteConversation = async () => {
    if (!selectedThreadId || !user) return;
    
    try {
      // Get current thread data
      const { data: threadData } = await getMessageThread(selectedThreadId);
      if (!threadData) return;
      
      const thread = threadData as MessageThread;
      const mutedBy = thread.mutedBy || [];
      const isMuted = mutedBy.includes(user.uid);
      
      // Toggle mute state
      const updatedMutedBy = isMuted
        ? mutedBy.filter((id: string) => id !== user.uid)
        : [...mutedBy, user.uid];
      
      // Update thread in Firestore
      const { error } = await updateDocument('messageThreads', selectedThreadId, {
        mutedBy: updatedMutedBy
      });
      
      if (error) {
        console.error('Error muting conversation:', error);
        alert('Failed to mute conversation. Please try again.');
        return;
      }
      
      // Update local state
      setThreads(prevThreads =>
        prevThreads.map(t =>
          t.thread.id === selectedThreadId
            ? { ...t, thread: { ...t.thread, mutedBy: updatedMutedBy } }
            : t
        )
      );
      
      // Update selected thread state if it's the current one
      if (selectedThread) {
        setSelectedThread({
          ...selectedThread,
          thread: { ...selectedThread.thread, mutedBy: updatedMutedBy }
        });
      }
      
      setShowConversationMenu(false);
    } catch (error) {
      console.error('Error muting conversation:', error);
      alert('Failed to mute conversation. Please try again.');
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !user || !profile) return;

    setIsSending(true);
    try {
      const messageData = {
        senderId: user.uid,
        senderName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User',
        content: newMessage.trim()
      };

      const { error: messageError } = await sendMessage(selectedThread.thread.id, messageData);
      
      if (messageError) {
        console.error('Error sending message:', messageError);
        return;
      }

      // Add message to local state
      const newMsg: Message = {
        id: Date.now().toString(),
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
        const { data: refreshedMessages } = await getThreadMessages(selectedThread.thread.id);
        if (refreshedMessages) {
          setMessages(refreshedMessages as Message[]);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error sending message:', error);
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

  // Handler for accepting message requests
  const handleAcceptRequest = async (thread: ThreadWithParticipants) => {
    if (!user) return;
    
    const { error } = await acceptMessageThread(thread.thread.id, user.uid);
    if (error) {
      console.error('Error accepting request:', error);
      return;
    }
    
    // Update local state
    setThreads(prevThreads => 
      prevThreads.map(t => 
        t.thread.id === thread.thread.id 
          ? { ...t, thread: { ...t.thread, acceptedBy: [...(t.thread.acceptedBy || []), user.uid] } }
          : t
      )
    );
  };

  // Filter threads based on search and active filter
  const filteredThreads = threads.filter(threadData => {
    const matchesSearch = !searchQuery || 
      threadData.otherParticipant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threadData.otherParticipant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threadData.otherParticipant?.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Check if thread is accepted by current user
    const isAccepted = threadData.thread.acceptedBy?.includes(user?.uid || '');
    
    // Filter based on active tab
    if (activeFilter === 'all') {
      return isAccepted; // Only show accepted conversations in "Active Conversations"
    }
    
    return matchesSearch;
  });

  // Get message requests (not yet accepted by current user)
  const messageRequests = threads.filter(threadData => {
    const isAccepted = threadData.thread.acceptedBy?.includes(user?.uid || '');
    return !isAccepted;
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/home/seeker"
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

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 w-full">
        
        {/* Mobile: Show list OR conversation, Desktop: Show both */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-6 h-[calc(100vh-120px)]">
          
          {/* Thread List Sidebar */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
            
            {/* Thread List Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-navy-900">Messages</h1>
                <p className="text-sm text-slate-600">When employers reach out to you, your messages will appear here.</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm text-navy-900 placeholder-slate-400"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-1 mt-4">
                {[
                  { key: 'all', label: 'Active Conversations', count: filteredThreads.length },
                  { key: 'unread', label: 'Message Requests', count: messageRequests.length }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      activeFilter === filter.key
                        ? 'bg-navy-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
            
            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {(activeFilter === 'all' ? filteredThreads : messageRequests).length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">
                    {activeFilter === 'all' ? 'No conversations yet' : 'No message requests'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {(activeFilter === 'all' ? filteredThreads : messageRequests).map((threadData) => (
                    <div
                      key={threadData.thread.id}
                      onClick={() => handleThreadSelect(threadData)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedThreadId === threadData.thread.id
                          ? 'bg-sky-200/20 border border-light-blue/30'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                          {threadData.otherParticipant?.profileImageUrl ? (
                            <img
                              src={threadData.otherParticipant.profileImageUrl}
                              alt="Avatar"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-900 truncate">
                              {threadData.otherParticipant 
                                ? `${threadData.otherParticipant.firstName || ''} ${threadData.otherParticipant.lastName || ''}`.trim() || 'Unknown Employer'
                                : 'Unknown Employer'
                              }
                            </h3>
                            <span className="text-xs text-slate-500">
                              {threadData.thread.lastMessageAt ? 
                                new Date(threadData.thread.lastMessageAt.toDate ? threadData.thread.lastMessageAt.toDate() : threadData.thread.lastMessageAt).toLocaleDateString() === new Date().toLocaleDateString() ?
                                  new Date(threadData.thread.lastMessageAt.toDate ? threadData.thread.lastMessageAt.toDate() : threadData.thread.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                                  new Date(threadData.thread.lastMessageAt.toDate ? threadData.thread.lastMessageAt.toDate() : threadData.thread.lastMessageAt).toLocaleDateString() :
                                'Recently'
                              }
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 truncate">
                            {threadData.otherParticipant?.companyName || threadData.otherParticipant?.role || 'Employer'}
                          </p>
                          {threadData.thread.lastMessageAt && (
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {threadData.lastMessage?.content || 'No messages yet'}
                            </p>
                          )}
                        </div>
                        {!threadData.thread.lastMessageAt && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      {/* Accept Button for Message Requests */}
                      {activeFilter === 'unread' && !threadData.thread.acceptedBy?.includes(user?.uid || '') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptRequest(threadData);
                          }}
                          className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-[#000080] to-[#ADD8E6] text-white text-sm font-semibold rounded-lg hover:shadow-md transition-all"
                        >
                          Accept Request
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Conversation Pane */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
            
            {selectedThread ? (
              <>
                {/* Conversation Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                        {selectedThread.otherParticipant?.profileImageUrl ? (
                          <img
                            src={selectedThread.otherParticipant.profileImageUrl}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-navy-900">
                          {selectedThread.otherParticipant 
                            ? `${selectedThread.otherParticipant.firstName || ''} ${selectedThread.otherParticipant.lastName || ''}`.trim() || 'Unknown Employer'
                            : 'Unknown Employer'
                          }
                        </h2>
                        <p className="text-sm text-slate-600">
                          @{selectedThread.otherParticipant?.firstName?.toLowerCase() || 'employer'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setShowRecruiterInfo(true)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View recruiter profile"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <div className="relative" ref={menuRef}>
                        <button 
                          onClick={() => setShowConversationMenu(!showConversationMenu)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="More options"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                          {showConversationMenu && selectedThread && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                              <div className="py-1">
                                <button
                                  onClick={handleArchiveConversation}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <Archive className="h-4 w-4 text-slate-600" />
                                  <span>{selectedThread.thread.archivedBy?.includes(user?.uid || '') ? 'Unarchive conversation' : 'Archive conversation'}</span>
                                </button>
                                <button
                                  onClick={handleMuteConversation}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <BellOff className="h-4 w-4 text-slate-600" />
                                  <span>{selectedThread.thread.mutedBy?.includes(user?.uid || '') ? 'Unmute notifications' : 'Mute notifications'}</span>
                                </button>
                                <div className="border-t border-slate-200 my-1"></div>
                                <button
                                  onClick={handleDeleteConversation}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                  <span>Delete conversation</span>
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4 max-w-full">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'} w-full`}>
                          <div className="max-w-xs lg:max-w-md w-full">
                            {/* Job Details Card - Show above message if present */}
                            {message.jobDetails && (
                              <Link 
                                href={`/job/${message.jobDetails.jobId}${selectedThreadId ? `?thread=${selectedThreadId}` : ''}`}
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
                              message.senderId === user?.uid
                                ? 'bg-navy-800 text-white'
                                : 'bg-slate-100 text-slate-900'
                            }`}>
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.senderId === user?.uid ? 'text-blue-100' : 'text-slate-500'
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
                    <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a conversation</h3>
                  <p className="text-slate-500">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Thread List View */}
        {mobileView === 'list' && (
          <div className="md:hidden bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col" style={{height: 'calc(100vh - 120px)'}}>
            {/* Thread List Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <div className="mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-navy-900">Messages</h1>
                <p className="text-xs sm:text-sm text-slate-600">When employers reach out to you, your messages will appear here.</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-2 mt-3">
                {[
                  { key: 'all', label: 'Active', count: filteredThreads.length },
                  { key: 'unread', label: 'Requests', count: messageRequests.length }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors min-h-[44px] ${
                      activeFilter === filter.key
                        ? 'bg-navy-800 text-white'
                        : 'text-slate-600 bg-slate-100'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
            
            {/* Thread List */}
            <div className="flex-1 overflow-y-auto mobile-scroll">
              {(activeFilter === 'all' ? filteredThreads : messageRequests).length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">
                    {activeFilter === 'all' ? 'No conversations yet' : 'No message requests'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {(activeFilter === 'all' ? filteredThreads : messageRequests).map((threadData) => (
                    <div
                      key={threadData.thread.id}
                      onClick={() => handleThreadSelect(threadData)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors min-h-[72px] ${
                        selectedThreadId === threadData.thread.id
                          ? 'bg-sky-200/20 border border-light-blue/30'
                          : 'hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                          {threadData.otherParticipant?.profileImageUrl ? (
                            <img
                              src={threadData.otherParticipant.profileImageUrl}
                              alt="Avatar"
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900 truncate">
                              {threadData.otherParticipant 
                                ? `${threadData.otherParticipant.firstName || ''} ${threadData.otherParticipant.lastName || ''}`.trim() || 'Unknown Employer'
                                : 'Unknown Employer'
                              }
                            </h3>
                            <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                              {threadData.thread.lastMessageAt ? 
                                new Date(threadData.thread.lastMessageAt.toDate ? threadData.thread.lastMessageAt.toDate() : threadData.thread.lastMessageAt).toLocaleDateString() === new Date().toLocaleDateString() ?
                                  new Date(threadData.thread.lastMessageAt.toDate ? threadData.thread.lastMessageAt.toDate() : threadData.thread.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                                  new Date(threadData.thread.lastMessageAt.toDate ? threadData.thread.lastMessageAt.toDate() : threadData.thread.lastMessageAt).toLocaleDateString() :
                                'Recently'
                              }
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 truncate">
                            {threadData.otherParticipant?.companyName || threadData.otherParticipant?.role || 'Employer'}
                          </p>
                          {threadData.thread.lastMessageAt && (
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {threadData.lastMessage?.content || 'No messages yet'}
                            </p>
                          )}
                        </div>
                        {!threadData.thread.lastMessageAt && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      {/* Accept Button for Message Requests */}
                      {activeFilter === 'unread' && !threadData.thread.acceptedBy?.includes(user?.uid || '') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptRequest(threadData);
                          }}
                          className="mt-3 w-full px-4 py-2.5 bg-gradient-to-r from-[#000080] to-[#ADD8E6] text-white text-sm font-semibold rounded-lg hover:shadow-md transition-all min-h-[44px]"
                        >
                          Accept Request
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile: Conversation View */}
        {mobileView === 'conversation' && selectedThread && (
          <div className="md:hidden bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col mx-auto w-full max-w-full" style={{height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)'}}>
            {/* Conversation Header with Back Button */}
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMobileView('list')}
                  className="flex items-center text-navy-800 font-semibold hover:text-blue-900 transition-colors min-h-[44px] pr-2"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  <span className="text-sm">Back</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setShowRecruiterInfo(true)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="View recruiter profile"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {selectedThread.otherParticipant?.profileImageUrl ? (
                    <img
                      src={selectedThread.otherParticipant.profileImageUrl}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-navy-900 truncate">
                    {selectedThread.otherParticipant 
                      ? `${selectedThread.otherParticipant.firstName || ''} ${selectedThread.otherParticipant.lastName || ''}`.trim() || 'Unknown Employer'
                      : 'Unknown Employer'
                    }
                  </h2>
                  <p className="text-sm text-slate-600 truncate">
                    {selectedThread.otherParticipant?.companyName || selectedThread.otherParticipant?.role || 'Employer'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 mobile-scroll">
              <div className="space-y-4 max-w-full">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'} w-full`}>
                      <div className="max-w-[85%] sm:max-w-sm w-full">
                        {/* Job Details Card */}
                          {message.jobDetails && (
                            <Link 
                              href={`/job/${message.jobDetails.jobId}${selectedThreadId ? `?thread=${selectedThreadId}` : ''}`}
                              className="block mb-2"
                            >
                            <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all active:scale-[0.98]">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-navy-800 to-sky-500 rounded-lg flex items-center justify-center shadow-sm">
                                  <i className="fa-solid fa-briefcase text-white text-sm"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-navy-900 truncate">
                                    {message.jobDetails.jobTitle}
                                  </h4>
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
                          message.senderId === user?.uid
                            ? 'bg-navy-800 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}>
                          <p className="text-sm sm:text-base break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === user?.uid ? 'text-blue-100' : 'text-slate-500'
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
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-white">
              <div className="flex items-end space-x-2 sm:space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Send a message..."
                    className="w-full px-4 py-3 text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 resize-none text-navy-900 placeholder-slate-400"
                    rows={1}
                    disabled={isSending}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-navy-800 text-white px-4 py-3 rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[48px] min-w-[48px] shadow-md"
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
        )}

        {/* Mobile: Empty State */}
        {mobileView === 'conversation' && !selectedThread && (
          <div className="md:hidden bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center justify-center" style={{height: 'calc(100vh - 120px)'}}>
            <div className="text-center px-4">
              <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a conversation</h3>
              <p className="text-slate-500 mb-4">Choose a conversation to start messaging</p>
              <button
                onClick={() => setMobileView('list')}
                className="bg-navy-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy-700 transition-colors min-h-[48px] shadow-md"
              >
                View Conversations
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recruiter Info Modal */}
      {showRecruiterInfo && selectedThread?.otherParticipant && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 mobile-safe-top mobile-safe-bottom"
          onClick={() => setShowRecruiterInfo(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto mobile-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-sky-50 to-white border-b border-slate-100 rounded-t-2xl px-6 py-8">
              <button
                onClick={() => setShowRecruiterInfo(false)}
                className="absolute top-4 right-4 w-8 h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
              
              {/* Profile Picture */}
              <div className="flex justify-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white p-2 shadow-lg border-4 border-white">
                  {selectedThread.otherParticipant.profileImageUrl ? (
                    <img
                      src={selectedThread.otherParticipant.profileImageUrl}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-navy-800 to-sky-500 flex items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-bold text-white">
                        {selectedThread.otherParticipant.firstName?.[0]?.toUpperCase() || 'R'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
              {/* Name and Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 mb-2">
                  {`${selectedThread.otherParticipant.firstName || ''} ${selectedThread.otherParticipant.lastName || ''}`.trim() || 'Recruiter'}
                </h2>
                <p className="text-base sm:text-lg text-slate-600 mb-1">
                  {selectedThread.otherParticipant.headline || selectedThread.otherParticipant.role || 'Recruiter'}
                </p>
                {selectedThread.otherParticipant.companyName && (
                  <div className="flex items-center justify-center text-slate-600 mb-3">
                    <i className="fa-solid fa-building mr-2 text-sky-500"></i>
                    <span className="font-semibold text-sm sm:text-base">{selectedThread.otherParticipant.companyName}</span>
                  </div>
                )}
                {selectedThread.otherParticipant.email && (
                  <div className="flex items-center justify-center text-slate-600">
                    <i className="fa-solid fa-envelope mr-2 text-sky-500"></i>
                    <span className="text-xs sm:text-sm break-all">{selectedThread.otherParticipant.email}</span>
                  </div>
                )}
              </div>

              {/* Bio Section */}
              {selectedThread.otherParticipant.bio && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-navy-900 mb-2 flex items-center">
                    <i className="fa-solid fa-user mr-2 text-sky-500"></i>
                    About
                  </h3>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {selectedThread.otherParticipant.bio}
                  </p>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-6">
                {selectedThread.otherParticipant.location && (
                  <div className="flex items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <i className="fa-solid fa-location-dot text-sky-600"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Location</p>
                      <p className="text-sm text-slate-700 truncate">{selectedThread.otherParticipant.location}</p>
                    </div>
                  </div>
                )}

                {selectedThread.otherParticipant.company && (
                  <div className="flex items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <i className="fa-solid fa-briefcase text-sky-600"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Company</p>
                      <p className="text-sm text-slate-700 truncate">{selectedThread.otherParticipant.company}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <button
                  onClick={() => {
                    const otherId = selectedThread.thread.participantIds.find(id => id !== user?.uid);
                    if (otherId) {
                      router.push(`/company/${otherId}`);
                    }
                    setShowRecruiterInfo(false);
                  }}
                  className="w-full px-6 py-3 bg-navy-800 text-white font-semibold rounded-lg hover:bg-navy-700 hover:shadow-lg transition-all min-h-[48px] text-base"
                >
                  View Company Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function CandidateMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#E6F0FF] to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#000080] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    }>
      <CandidateMessagesPageContent />
    </Suspense>
  );
}
