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
    <main className="min-h-screen" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 40%, #F8FAFC 100%)'}}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Back to Dashboard Link */}
        <div className="mb-10">
          <Link 
            href="/home/seeker"
            className="inline-flex items-center text-navy font-semibold hover:text-blue-900 transition-all duration-300 bg-light-blue/10 hover:bg-light-blue/30 hover:shadow-md hover:scale-105 px-4 py-2 rounded-full group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Dashboard
          </Link>
        </div>

        {/* Page Header */}
        <header className="mb-10">
          <div className="flex items-center space-x-4">
            <Star className="h-12 w-12 text-yellow-400" />
            <div>
              <h1 className="text-4xl font-extrabold text-navy">Your Endorsements</h1>
              <p className="text-gray-500 mt-1 text-lg">Professional recommendations from colleagues, managers, and peers.</p>
            </div>
          </div>
        </header>

        {/* Endorsement Summary Card */}
        <section className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between mb-8 hover:shadow-lg transition-all duration-200">
          <div>
            <h2 className="text-xl font-bold text-navy">Endorsement Summary</h2>
            <p className="text-gray-600 mt-1">You have received <span className="font-bold text-navy">{endorsements.length}</span> endorsements.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-5xl font-extrabold text-yellow-500">{endorsements.length}</p>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Endorsements</p>
            </div>
          </div>
        </section>
        
        {/* Share Link Promo Card */}
        <section className="bg-gradient-to-br from-light-blue to-navy text-white p-8 rounded-2xl shadow-lg mb-8 hover:shadow-xl transition-all duration-200">
          <div className="flex items-start space-x-4 mb-6">
            <svg className="w-8 h-8 mt-1 text-blue-100" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
            <div>
              <h2 className="text-2xl font-bold">Share Your Endorsement Link</h2>
              <p className="text-blue-100 mt-1">Send this link to colleagues, managers, professors, or anyone who can vouch for your skills and experience.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-grow w-full">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.42l-.47.48a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24z"/>
              </svg>
              <input 
                type="text" 
                value={typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`}
                readOnly 
                className="w-full bg-white/20 border-2 border-white/30 rounded-lg py-3 pl-10 pr-4 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all cursor-pointer"
              />
            </div>
            <button
              onClick={() => {
                const link = typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`;
                navigator.clipboard.writeText(link);
                // You could add a toast notification here
              }}
              className="bg-white text-navy font-bold py-3 px-8 rounded-lg w-full sm:w-auto hover:bg-light-blue/20 transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy focus:ring-white"
            >
              <span>Copy Link</span>
              <svg className="w-4 h-4 ml-2 inline" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Empty State Card */}
        {endorsements.length === 0 ? (
          <section className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 text-center hover:shadow-lg transition-all duration-200">
            <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Star className="h-12 w-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-navy">No endorsements yet</h2>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">Start building your professional reputation by sharing your endorsement link with colleagues and mentors.</p>
            <div className="mt-8 bg-light-blue/20 border border-light-blue/50 rounded-xl p-6 max-w-sm mx-auto text-left">
              <h3 className="font-bold text-navy mb-4">Share your link with:</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-light-blue rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Former managers and supervisors</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-light-blue rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Colleagues and teammates</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-light-blue rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Professors and academic advisors</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-light-blue rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Clients and collaborators</span>
                </li>
              </ul>
            </div>
          </section>
        ) : (
          /* Endorsements List */
          <div className="space-y-6">
            {endorsements.map((endorsement: any, index: number) => (
              <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-200">
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
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Endorsements help employers understand your strengths and professional relationships.</p>
          <p>Keep sharing your link to build a strong professional reputation!</p>
        </footer>
      </div>
    </main>
  );
}
