"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { User, MessageSquare, ArrowRight, Loader2, Bell, CheckCircle, ArrowLeft, Send, Search, MoreHorizontal, Phone, Eye, Star } from "lucide-react";
import { getUserMessageThreads, getDocument, getMessageThread, getThreadMessages, sendMessage } from '@/lib/firebase-firestore';
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

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  read: boolean;
}

export default function CandidateMessagesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Handle thread selection
  const handleThreadSelect = async (thread: ThreadWithParticipants) => {
    setSelectedThreadId(thread.thread.id);
    setSelectedThread(thread);
    
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

  // Filter threads based on search and active filter
  const filteredThreads = threads.filter(threadData => {
    const matchesSearch = !searchQuery || 
      threadData.otherParticipant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threadData.otherParticipant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threadData.otherParticipant?.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // For now, just return search matches since we don't have archived/starred states
    return matchesSearch;
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <main className="min-h-screen" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)'}}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          
          {/* Thread List Sidebar */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            
            {/* Thread List Header */}
            <div className="p-6 border-b border-slate-200/60">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
                  <p className="text-sm text-slate-500">Your conversations with employers.</p>
                </div>
                <button className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors">
                  New Message
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy/30 focus:border-transparent text-sm"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-1 mt-4">
                {[
                  { key: 'all', label: 'Active Conversations', count: threads.filter(t => t.thread.lastMessageAt).length },
                  { key: 'unread', label: 'Message Requests', count: threads.filter(t => !t.thread.lastMessageAt).length }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      activeFilter === filter.key
                        ? 'bg-navy text-white'
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
              {filteredThreads.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredThreads.map((threadData) => (
                    <div
                      key={threadData.thread.id}
                      onClick={() => handleThreadSelect(threadData)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedThreadId === threadData.thread.id
                          ? 'bg-light-blue/20 border border-light-blue/30'
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Conversation Pane */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            
            {selectedThread ? (
              <>
                {/* Conversation Header */}
                <div className="p-6 border-b border-slate-200/60">
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
                        <h2 className="text-lg font-semibold text-slate-900">
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
                      <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Phone className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                            message.senderId === user?.uid
                              ? 'bg-navy text-white'
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
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                
                {/* Message Composer */}
                <div className="p-6 border-t border-slate-200/60">
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
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy/30 focus:border-transparent resize-none"
                        rows={1}
                        disabled={isSending}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-navy text-white px-4 py-3 rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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
      </div>
    </main>
  );
}
