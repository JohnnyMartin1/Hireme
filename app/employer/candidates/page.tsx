"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, MessageSquare, ArrowRight, Loader2, Calendar } from "lucide-react";
import { getUserMessageThreads, getDocument } from '@/lib/firebase-firestore';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

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

export default function ContactedCandidatesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<ContactedCandidate[]>([]);
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
    const fetchContactedCandidates = async () => {
      if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching contacted candidates for employer:', user.uid);
        
        // Get all message threads for this user
        const { data: threads, error: threadsError } = await getUserMessageThreads(user.uid);
        
        if (threadsError) {
          console.error('Error fetching threads:', threadsError);
          setError('Failed to load contacted candidates');
          return;
        }

        if (!threads || threads.length === 0) {
          setCandidates([]);
          return;
        }

        // Extract unique candidates from threads
        const candidateData: ContactedCandidate[] = [];
        const seenCandidateIds = new Set<string>();

        for (const thread of threads) {
          // Find the other participant (the candidate)
          const otherParticipantId = (thread as any).participantIds?.find((id: string) => id !== user.uid);
          
          if (otherParticipantId && !seenCandidateIds.has(otherParticipantId)) {
            try {
              const { data: candidateProfile } = await getDocument('users', otherParticipantId);
              
              if (candidateProfile && (candidateProfile as any).role === 'JOB_SEEKER') {
                candidateData.push({
                  id: otherParticipantId,
                  firstName: (candidateProfile as any).firstName || '',
                  lastName: (candidateProfile as any).lastName || '',
                  headline: (candidateProfile as any).headline || 'Job Seeker',
                  skills: (candidateProfile as any).skills || [],
                  threadId: thread.id,
                  lastMessageAt: (thread as any).lastMessageAt,
                  school: (candidateProfile as any).school,
                  major: (candidateProfile as any).major
                });
                seenCandidateIds.add(otherParticipantId);
              }
            } catch (error) {
              console.warn('Could not fetch candidate profile:', otherParticipantId);
            }
          }
        }

        // Sort by most recent message
        candidateData.sort((a, b) => {
          const aTime = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate() : a.lastMessageAt;
          const bTime = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate() : b.lastMessageAt;
          
          if (!aTime && !bTime) return 0;
          if (!aTime) return 1;
          if (!bTime) return -1;
          
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setCandidates(candidateData);
      } catch (err) {
        console.error('Error fetching contacted candidates:', err);
        setError('Failed to load contacted candidates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactedCandidates();
  }, [user, profile]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading contacted candidates...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || profile.role !== 'EMPLOYER') {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <BackButton fallback="/home/employer" />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <BackButton fallback="/home/employer" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Candidates Contacted</h1>
                <p className="text-gray-600">{candidates.length} candidates you've reached out to</p>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates contacted yet</h3>
              <p className="text-gray-500 mb-6">Start reaching out to candidates to build your network</p>
              <Link
                href="/search/candidates"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Search Candidates
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {candidate.firstName} {candidate.lastName}
                          </h3>
                          <p className="text-gray-600">{candidate.headline}</p>
                        </div>
                      </div>
                      
                      {candidate.school && candidate.major && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600">
                            🎓 {candidate.school} - {candidate.major}
                          </p>
                        </div>
                      )}
                      
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills.slice(0, 5).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {candidate.skills.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{candidate.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500">
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
      </div>
    </main>
  );
}
