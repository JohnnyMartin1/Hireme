"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, User, MessageSquare, Building, Copy, Check } from "lucide-react";
import { getEndorsements } from '@/lib/firebase-firestore';
import Link from 'next/link';

export default function EndorsementsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading endorsements...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  const handleCopyLink = () => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/home/seeker"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-colors group px-3 py-2 rounded-lg hover:bg-sky-50 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm hidden sm:inline">Back to Dashboard</span>
            <span className="font-medium text-sm sm:hidden">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center shadow-md">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        {/* Page Header */}
        <div className="text-center mb-12 lg:mb-14">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-navy-700" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">Your Endorsements</h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">Professional recommendations from colleagues, managers, and peers.</p>
        </div>

        {/* Endorsement Summary Card */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-navy-900 mb-2">Endorsement Summary</h2>
              <p className="text-slate-600 leading-relaxed">You have received <span className="font-bold text-navy-900">{endorsements.length}</span> endorsements.</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-5xl font-bold text-navy-900">{endorsements.length}</p>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase mt-1">Total Endorsements</p>
            </div>
          </div>
        </section>
        
        {/* Share Link Promo Card */}
        <section className="bg-gradient-to-br from-navy-800 to-navy-900 text-white p-8 lg:p-10 rounded-2xl shadow-xl mb-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Share Your Endorsement Link</h2>
              <p className="text-sky-200 leading-relaxed">Send this link to colleagues, managers, professors, or anyone who can vouch for your skills and experience.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-grow">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <input 
                type="text" 
                value={typeof window !== 'undefined' ? `${window.location.origin}/endorse/${user.uid}` : `/endorse/${user.uid}`}
                readOnly 
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3.5 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all text-base"
              />
            </div>
            <button
              onClick={handleCopyLink}
              className="bg-white text-navy-900 font-semibold py-3.5 px-8 rounded-lg hover:bg-sky-50 transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-900 focus:ring-white flex items-center justify-center gap-2 min-h-[48px] text-base"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-8">
            {error}
          </div>
        )}

        {/* Empty State Card */}
        {endorsements.length === 0 ? (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 lg:p-10 text-center hover:shadow-2xl transition-shadow duration-300">
            <div className="w-20 h-20 mx-auto bg-sky-100 rounded-full flex items-center justify-center mb-6">
              <Star className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-navy-900 mb-4">No endorsements yet</h2>
            <p className="text-slate-600 leading-relaxed max-w-md mx-auto mb-8">Start building your professional reputation by sharing your endorsement link with colleagues and mentors.</p>
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-6 max-w-md mx-auto text-left">
              <h3 className="font-bold text-navy-900 mb-4">Share your link with:</h3>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-sky-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Former managers and supervisors</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-sky-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Colleagues and teammates</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-sky-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Professors and academic advisors</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-sky-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Clients and collaborators</span>
                </li>
              </ul>
            </div>
          </section>
        ) : (
          /* Endorsements List */
          <div className="space-y-6">
            {endorsements.map((endorsement: any, index: number) => (
              <div key={index} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-navy-900 mb-3">{endorsement.skill}</h4>
                    <div className="flex items-center flex-wrap gap-2 text-slate-600">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{endorsement.endorserName}</span>
                      {endorsement.endorserTitle && endorsement.endorserCompany && (
                        <span className="text-slate-500">• {endorsement.endorserTitle} at {endorsement.endorserCompany}</span>
                      )}
                      {endorsement.endorserTitle && !endorsement.endorserCompany && (
                        <span className="text-slate-500">• {endorsement.endorserTitle}</span>
                      )}
                      {!endorsement.endorserTitle && endorsement.endorserCompany && (
                        <span className="text-slate-500">• {endorsement.endorserCompany}</span>
                      )}
                      {endorsement.endorserLinkedIn && (
                        <a
                          href={endorsement.endorserLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-navy-800 hover:text-navy-600 transition-colors"
                          title="View LinkedIn Profile"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    <Star className="h-6 w-6 text-yellow-500 fill-current" />
                  </div>
                </div>
                
                {endorsement.message && (
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-6">
                    <p className="text-slate-700 leading-relaxed">"{endorsement.message}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Footer */}
        <footer className="text-center mt-12 lg:mt-16 pt-8 border-t border-slate-200">
          <p className="text-slate-600 leading-relaxed">Endorsements help employers understand your strengths and professional relationships.</p>
          <p className="text-slate-600 leading-relaxed mt-2">Keep sharing your link to build a strong professional reputation!</p>
        </footer>
      </main>
    </div>
  );
}
