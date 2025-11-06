"use client";
import { useState, useEffect } from 'react';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { getSavedCandidates, saveCandidate } from '@/lib/firebase-firestore';
import { User, MapPin, GraduationCap, Star, MessageSquare, Heart, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface SavedCandidate {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  school?: string;
  major?: string;
  location?: string;
  skills?: string[];
  savedAt?: any;
  [key: string]: any;
}

export default function SavedCandidatesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [savedCandidates, setSavedCandidates] = useState<SavedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (profile && profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
      router.push("/home/seeker");
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const fetchSavedCandidates = async () => {
      if (!user || (profile?.role !== 'EMPLOYER' && profile?.role !== 'RECRUITER')) return;

      setIsLoading(true);
      try {
        const { data, error: fetchError } = await getSavedCandidates(user.uid);
        
        if (fetchError) {
          setError(fetchError);
          return;
        }

        setSavedCandidates(data || []);
      } catch (err) {
        console.error('Error fetching saved candidates:', err);
        setError('Failed to load saved candidates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedCandidates();
  }, [user, profile]);

  const handleUnsaveCandidate = async (candidateId: string) => {
    if (!user) return;

    try {
      const { error } = await saveCandidate(user.uid, candidateId);
      
      if (error) {
        console.error('Error unsaving candidate:', error);
        return;
      }

      // Remove from local state
      setSavedCandidates(prev => prev.filter(candidate => candidate.id !== candidateId));
    } catch (err) {
      console.error('Error in handleUnsaveCandidate:', err);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved candidates...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
    return null;
  }

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full md:max-w-6xl md:mx-auto px-0 sm:px-3 md:p-6 py-4 sm:py-6 min-w-0">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8 px-2 sm:px-0">
          <Link 
            href="/home/employer"
            className="inline-flex items-center text-green-600 hover:text-green-800 transition-colors mb-3 sm:mb-4 min-h-[44px] text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">Saved Candidates</h1>
          <p className="text-sm sm:text-base text-gray-600 break-words">
            {savedCandidates.length} candidate{savedCandidates.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 sm:mb-4 md:mb-6 p-3 sm:p-4 bg-red-50 text-red-800 rounded-lg text-sm sm:text-base px-2 sm:px-0">
            {error}
          </div>
        )}

        {/* Saved Candidates */}
        {savedCandidates.length === 0 ? (
          <div className="w-full min-w-0 bg-white rounded-none sm:rounded-xl shadow-lg p-8 sm:p-10 md:p-12 text-center">
            <Heart className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 px-4">No saved candidates yet</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4 break-words">
              When you find candidates you're interested in, click the "Save" button to add them here.
            </p>
            <Link
              href="/search/candidates"
              className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-h-[44px] text-sm sm:text-base"
            >
              Search Candidates
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {savedCandidates.map((candidate) => (
              <div key={candidate.id} className="w-full min-w-0 bg-white rounded-none sm:rounded-xl shadow-lg p-4 sm:p-5 md:p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    <p className="text-gray-600 text-sm">{candidate.headline || 'No headline'}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {candidate.school && (
                    <div className="flex items-center text-sm text-gray-600">
                      <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                      {candidate.school}
                      {candidate.major && ` - ${candidate.major}`}
                    </div>
                  )}
                  
                  {candidate.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {candidate.location}
                    </div>
                  )}
                </div>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{candidate.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Saved {candidate.savedAt ? new Date(candidate.savedAt.toDate ? candidate.savedAt.toDate() : candidate.savedAt).toLocaleDateString() : 'Recently'}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/candidate/${candidate.id}`}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => handleUnsaveCandidate(candidate.id)}
                      className="px-3 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors flex items-center"
                      title="Remove from saved"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}