"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, User, MessageSquare, Building } from "lucide-react";
import { getEndorsements } from '@/lib/firebase-firestore';
import Link from 'next/link';

export default function EndorsementsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Check if user has the correct role
    if (profile && profile.role !== 'JOB_SEEKER') {
      router.push("/home");
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const fetchEndorsements = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await getEndorsements(user.uid);
        if (error) {
          setError('Failed to load endorsements');
        } else if (data) {
          setEndorsements(data);
        }
      } catch (err) {
        setError('Failed to load endorsements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEndorsements();
  }, [user]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading endorsements...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/home/seeker"
            className="text-blue-600 hover:underline flex items-center space-x-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Endorsements</h1>
              <p className="text-gray-600">Professional recommendations from colleagues, managers, and peers</p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Endorsement Summary</h2>
              <p className="text-gray-600">
                You have received <span className="font-semibold text-blue-600">{endorsements.length}</span> endorsement{endorsements.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-500">{endorsements.length}</div>
              <div className="text-sm text-gray-500">Total Endorsements</div>
            </div>
          </div>
        </div>

        {/* Share Link Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Share Your Endorsement Link
          </h3>
          <p className="mb-4 text-blue-100">
            Send this link to colleagues, managers, professors, or anyone who can vouch for your skills and experience.
          </p>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono bg-white/20 px-3 py-2 rounded flex-1 mr-4">
                {typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`}
              </code>
              <button
                onClick={() => {
                  const link = typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`;
                  navigator.clipboard.writeText(link);
                  // You could add a toast notification here
                }}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>

        {/* Endorsements List */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {endorsements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No endorsements yet</h3>
            <p className="text-gray-600 mb-6">
              Start building your professional reputation by sharing your endorsement link with colleagues and mentors.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Share your link with:</strong>
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Former managers and supervisors</li>
                <li>• Colleagues and teammates</li>
                <li>• Professors and academic advisors</li>
                <li>• Clients and collaborators</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {endorsements.map((endorsement: any, index: number) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-400">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{endorsement.skill}</h4>
                    <div className="flex items-center text-gray-600 mb-2">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-medium">{endorsement.endorserName}</span>
                      {endorsement.endorserTitle && endorsement.endorserCompany && (
                        <span className="text-gray-500 ml-2">• {endorsement.endorserTitle} at {endorsement.endorserCompany}</span>
                      )}
                      {endorsement.endorserTitle && !endorsement.endorserCompany && (
                        <span className="text-gray-500 ml-2">• {endorsement.endorserTitle}</span>
                      )}
                      {!endorsement.endorserTitle && endorsement.endorserCompany && (
                        <span className="text-gray-500 ml-2">• {endorsement.endorserCompany}</span>
                      )}
                      {endorsement.endorserLinkedIn && (
                        <a
                          href={endorsement.endorserLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          title="View LinkedIn Profile"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  </div>
                </div>
                
                {endorsement.message && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 italic leading-relaxed">"{endorsement.message}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Endorsements help employers understand your strengths and professional relationships.</p>
          <p className="mt-1">Keep sharing your link to build a strong professional reputation!</p>
        </div>
      </div>
    </main>
  );
}
