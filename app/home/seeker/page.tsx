"use client";
import Link from "next/link";
import Image from "next/image";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  User, 
  MessageSquare, 
  Eye, 
  Calendar,
  MapPin,
  Star,
  X
} from "lucide-react";
import { getUserMessageThreads, getProfileViewCount, getDocument, getProfileViewers, updateDocument, getEndorsements } from '@/lib/firebase-firestore';
import WelcomePopup from "@/components/WelcomePopup";
import { useProfileCompletion } from "@/components/ProfileCompletionProvider";

import type { UserProfile } from "@/types/user";

export default function SeekerHomePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const { completion, updateCompletion } = useProfileCompletion();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [profileViews, setProfileViews] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [threadDetails, setThreadDetails] = useState<any[]>([]);
  // Tri-state for modal visibility to prevent flicker
  const [onboardingModalState, setOnboardingModalState] = useState<'unknown' | 'open' | 'closed'>('unknown');
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);

  // Utility function to determine if onboarding should be shown
  const shouldShowOnboarding = useCallback((userProfile: UserProfile | null, localDismissed: string | null): boolean => {
    // Don't show if user is not authenticated
    if (!userProfile || !user) return false;
    
    // Don't show if server flag is true (onboardingSeen or legacy hasSeenWelcomePopup)
    if (userProfile.onboardingSeen === true || userProfile.hasSeenWelcomePopup === true) {
      console.log('Onboarding already seen - server flags:', { onboardingSeen: userProfile.onboardingSeen, hasSeenWelcomePopup: userProfile.hasSeenWelcomePopup });
      return false;
    }
    
    // Don't show if localStorage flag is set
    if (localDismissed === '1') {
      console.log('Onboarding dismissed in localStorage');
      return false;
    }
    
    // Show only for authenticated job seekers who haven't seen it
    const shouldShow = userProfile.role === 'JOB_SEEKER' && userProfile.emailVerified === true;
    console.log('Onboarding decision:', { shouldShow, role: userProfile.role, emailVerified: userProfile.emailVerified, onboardingSeen: userProfile.onboardingSeen, hasSeenWelcomePopup: userProfile.hasSeenWelcomePopup, localDismissed });
    return shouldShow;
  }, [user]);

  const handleCloseWelcomePopup = async () => {
    console.log('Closing welcome popup - setting localStorage and server flags');
    
    // Optimistically update localStorage immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('hireme:onboarding:v1:dismissed', '1');
      console.log('Set localStorage flag to 1');
    }
    
    // Update component state immediately
    setOnboardingModalState('closed');
    console.log('Set onboarding modal state to closed');
    
    // Update server flag
    if (user && profile) {
      try {
        await updateDocument('users', user.uid, {
          onboardingSeen: true,
          hasSeenWelcomePopup: true // Keep legacy field for backward compatibility
        });
        console.log('Updated server flags: onboardingSeen=true, hasSeenWelcomePopup=true');
        
        // Update local profile state
        setUserProfile(prevProfile => ({
          ...prevProfile,
          onboardingSeen: true,
          hasSeenWelcomePopup: true
        }));
        console.log('Updated local profile state with server flags');
      } catch (error) {
        console.error('Failed to update onboarding status:', error);
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Check if email is verified (using profile data from Firestore)
    if (profile && !profile.emailVerified) {
      router.push("/auth/verify-email");
      return;
    }

    // Check if user has the correct role
    if (profile && profile.role !== 'JOB_SEEKER') {
      if (profile.role === 'EMPLOYER') {
        router.push("/home/employer");
      } else {
        router.push("/admin");
      }
      return;
    }

    if (profile) {
      console.log('Profile data loaded:', profile);
      console.log('Profile image URL:', profile.profileImageUrl);
      setUserProfile(profile);
      
      // Update shared completion state
      updateCompletion(profile);
    }
  }, [user, profile, loading, router]);

  // Effect to compute onboarding modal state once user data is available
  useEffect(() => {
    if (!user || !userProfile) return;

    // Get localStorage value (browser only)
    const localDismissed = typeof window !== 'undefined' 
      ? localStorage.getItem('hireme:onboarding:v1:dismissed') 
      : null;

    // Compute whether to show onboarding
    const shouldShow = shouldShowOnboarding(userProfile, localDismissed);
    
    // Only update state if it's currently unknown or if the decision has changed
    if (onboardingModalState === 'unknown' || 
        (onboardingModalState === 'open' && !shouldShow) ||
        (onboardingModalState === 'closed' && shouldShow)) {
      setOnboardingModalState(shouldShow ? 'open' : 'closed');
    }
  }, [user, userProfile, shouldShowOnboarding, onboardingModalState]);

  // Listen for page focus/visibility changes to refresh completion when returning from profile page
  useEffect(() => {
    const handleFocus = async () => {
      if (user && profile) {
        // Refetch fresh profile data when page becomes visible
        try {
          const { data: freshProfile, error } = await getDocument('users', user.uid);
          if (!error && freshProfile) {
            setUserProfile(freshProfile);
            updateCompletion(freshProfile);
          }
        } catch (error) {
          console.error('Error refreshing profile data:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user, profile, updateCompletion]);

  // Multi-tab support: Listen for storage events to close modal if dismissed in another tab
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hireme:onboarding:v1:dismissed' && e.newValue === '1') {
        setOnboardingModalState('closed');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Close profile image modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProfileImageModalOpen) {
        setIsProfileImageModalOpen(false);
      }
    };

    if (isProfileImageModalOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isProfileImageModalOpen]);

  // Fetch real-time data (optimized with parallel requests)
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setIsLoadingStats(true);
      try {
        // Fetch threads and views in parallel for better performance
        const [threadsResult, viewsResult, endorsementsResult] = await Promise.all([
          getUserMessageThreads(user.uid),
          getProfileViewers(user.uid),
          getEndorsements(user.uid)
        ]);
        
        // Process threads data
        if (!threadsResult.error && threadsResult.data) {
          setThreads(threadsResult.data);
          
          // Fetch all participant profiles in parallel (batch request)
          const uniqueParticipantIds = new Set<string>();
          threadsResult.data.forEach((thread: any) => {
            const otherId = thread.participantIds.find((id: string) => id !== user.uid);
            if (otherId) uniqueParticipantIds.add(otherId);
          });
          
          // Batch fetch all unique profiles
          const profilePromises = Array.from(uniqueParticipantIds).map(id => 
            getDocument('users', id)
          );
          const profileResults = await Promise.all(profilePromises);
          
          // Create a map for quick lookup
          const profileMap = new Map();
          Array.from(uniqueParticipantIds).forEach((id, index) => {
            if (!profileResults[index].error && profileResults[index].data) {
              profileMap.set(id, profileResults[index].data);
            }
          });
          
          // Attach profiles to threads
          const threadsWithDetails = threadsResult.data.map((thread: any) => {
            const otherId = thread.participantIds.find((id: string) => id !== user.uid);
            return {
              ...thread,
              otherParticipant: otherId ? profileMap.get(otherId) : null
            };
          });
          
          setThreadDetails(threadsWithDetails);
        }

        // Process views data
        if (!viewsResult.error) {
          setProfileViews(viewsResult.count);
        }
        
        // Process endorsements data
        if (!endorsementsResult.error && endorsementsResult.data) {
          setEndorsements(endorsementsResult.data);
        }

      } catch (error) {
        // Silent fail - already handled by loading state
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Memoized helper function to format time difference
  const formatTimeAgo = useCallback((timestamp: any) => {
    if (!timestamp) return 'Recently';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  // Double-check role before rendering
  if (profile.role !== 'JOB_SEEKER') {
    return null; // Will redirect to appropriate dashboard
  }

  const QuickActionsCard = ({ className = "" }: { className?: string }) => (
    <div className={`w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 ${className}`}>
      <h2 className="text-xl font-bold text-navy-900 mb-6">Quick Actions</h2>
      <div className="space-y-1">
        <Link href="/account/profile" className="flex items-center p-4 rounded-xl hover:bg-sky-50 transition-all duration-200 cursor-pointer group">
          <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-sky-200 transition-colors">
            <User className="h-5 w-5 text-navy-700" />
          </div>
          <span className="font-semibold text-navy-900 group-hover:text-navy-700 transition-colors">Edit Profile</span>
          <svg className="ml-auto h-5 w-5 text-slate-400 group-hover:text-navy-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        {user?.uid ? (
          <Link href={`/candidate/${user.uid}`} className="flex items-center p-4 rounded-xl hover:bg-sky-50 transition-all duration-200 cursor-pointer group">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-sky-200 transition-colors">
              <Eye className="h-5 w-5 text-navy-700" />
            </div>
            <span className="font-semibold text-navy-900 group-hover:text-navy-700 transition-colors">Preview Profile</span>
            <svg className="ml-auto h-5 w-5 text-slate-400 group-hover:text-navy-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div className="flex items-center p-4 rounded-xl opacity-50 cursor-not-allowed">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
              <Eye className="h-5 w-5 text-navy-700" />
            </div>
            <span className="font-semibold text-navy-900">Preview Profile</span>
          </div>
        )}
        <Link href="/messages/candidate" className="flex items-center p-4 rounded-xl hover:bg-sky-50 transition-all duration-200 cursor-pointer group">
          <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-sky-200 transition-colors">
            <MessageSquare className="h-5 w-5 text-navy-700" />
          </div>
          <span className="font-semibold text-navy-900 group-hover:text-navy-700 transition-colors">View Messages</span>
          <svg className="ml-auto h-5 w-5 text-slate-400 group-hover:text-navy-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link href="/endorsements" className="flex items-center p-4 rounded-xl hover:bg-sky-50 transition-all duration-200 cursor-pointer group">
          <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-sky-200 transition-colors">
            <Star className="h-5 w-5 text-navy-700" />
          </div>
          <div className="flex-grow">
            <span className="font-semibold text-navy-900 group-hover:text-navy-700 transition-colors">Endorsements</span>
            {!isLoadingStats && endorsements.length === 0 && (
              <span className="block text-xs font-semibold tracking-wider text-amber-700 uppercase mt-0.5">Recommended</span>
            )}
          </div>
          <svg className="ml-auto h-5 w-5 text-slate-400 group-hover:text-navy-600 group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Profile Image Modal */}
      {isProfileImageModalOpen && userProfile?.profileImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsProfileImageModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsProfileImageModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-navy-900 rounded-full p-2 shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close image"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={userProfile.profileImageUrl}
                alt={`${profile?.firstName || 'User'}'s profile picture`}
                width={800}
                height={800}
                className="w-full h-full object-contain"
                style={{ maxHeight: '90vh' }}
              />
            </div>
          </div>
        </div>
      )}

    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 sm:pt-16 sm:pb-10 lg:pt-20 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            
            {/* Welcome Banner */}
            <section className="bg-gradient-to-br from-navy-800 via-navy-800 to-navy-900 text-white p-4 sm:p-5 lg:p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-4 sm:gap-5">
                {userProfile?.profileImageUrl ? (
                  <button
                    onClick={() => setIsProfileImageModalOpen(true)}
                    className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full"
                    aria-label="Enlarge profile picture"
                  >
                    <Image
                      src={userProfile.profileImageUrl}
                      alt={`${profile?.firstName || 'User'}'s avatar`}
                      width={120}
                      height={120}
                      className="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-full border-4 border-white/20 shadow-lg object-cover"
                      style={{ aspectRatio: '1 / 1' }}
                    />
                  </button>
                ) : (
                  <div className="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-full border-4 border-white/20 shadow-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-10 w-10 sm:h-14 sm:w-14 text-white/80" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Welcome back, {profile?.firstName || 'Job Seeker'}!</h1>
                  <p className="text-sky-200 mt-2 text-base sm:text-lg">Here's your dashboard overview for today.</p>
                </div>
              </div>
            </section>

            {/* Profile Completion Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-navy-900">Profile Completion</h2>
                <span className="text-2xl font-bold text-navy-900 bg-sky-50 px-4 py-1.5 rounded-full border border-sky-100">{completion}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-navy-800 to-sky-500 h-3 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="text-slate-600 leading-relaxed">
                Complete your profile to increase your visibility to top employers.{' '}
                <Link href="/account/profile" className="font-semibold text-navy-800 hover:text-navy-600 transition-colors">
                  Finish profile →
                </Link>
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <Link href="/messages/candidate" className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-6 sm:p-8 text-center group hover:shadow-2xl hover:border-sky-200 hover:-translate-y-1 transition-all duration-300">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center mb-5 group-hover:from-sky-200 group-hover:to-sky-100 transition-all duration-300 shadow-sm">
                  <MessageSquare className="h-7 w-7 text-navy-700" />
                </div>
                <p className="text-5xl font-bold text-navy-900 mb-1">{isLoadingStats ? '...' : threads.length}</p>
                <p className="text-slate-700 font-semibold mt-2">Messages</p>
              </Link>

              <Link href="/home/seeker/profile-views" className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-6 sm:p-8 text-center group hover:shadow-2xl hover:border-sky-200 hover:-translate-y-1 transition-all duration-300 block">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center mb-5 group-hover:from-sky-200 group-hover:to-sky-100 transition-all duration-300 shadow-sm">
                  <Eye className="h-7 w-7 text-navy-700" />
                </div>
                <p className="text-5xl font-bold text-navy-900 mb-1">{isLoadingStats ? '...' : profileViews}</p>
                <p className="text-slate-700 font-semibold mt-2">Profile Views</p>
              </Link>

              <Link href="/endorsements" className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-6 sm:p-8 text-center group hover:shadow-2xl hover:border-sky-200 hover:-translate-y-1 transition-all duration-300 relative">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center mb-5 relative group-hover:from-sky-200 group-hover:to-sky-100 transition-all duration-300 shadow-sm">
                  <Star className="h-7 w-7 text-navy-700" />
                  {!isLoadingStats && endorsements.length === 0 && (
                    <span className="absolute -top-2 -right-2 bg-navy-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">NEW</span>
                  )}
                </div>
                <p className="text-5xl font-bold text-navy-900 mb-1">{isLoadingStats ? '...' : endorsements.length}</p>
                <p className="text-slate-700 font-semibold mt-2">Endorsements</p>
              </Link>
            </div>

            {/* Endorsement Promo Card */}
            {!isLoadingStats && endorsements.length === 0 && (
              <div className="bg-gradient-to-br from-sky-50 to-white rounded-2xl shadow-xl border border-sky-100 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-md flex-shrink-0 border border-sky-100">
                    <Star className="h-7 w-7 text-navy-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-navy-900">Get Your First Endorsement</h3>
                    <p className="text-slate-600 mt-1">Boost your profile credibility and stand out from the crowd.</p>
                  </div>
                </div>
                <Link
                  href="/endorsements"
                  className="bg-navy-800 text-white font-semibold py-4 px-8 rounded-lg hover:bg-navy-700 transition-all duration-200 shadow-md hover:shadow-lg text-center whitespace-nowrap"
                >
                  Get Endorsements
                </Link>
              </div>
            )}

            {/* Mobile Quick Actions */}
            <div className="block lg:hidden">
              <QuickActionsCard />
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 hover:shadow-2xl transition-shadow duration-300">
              <h2 className="text-xl font-bold text-navy-900 mb-6">Recent Activity</h2>
              {threadDetails.length > 0 ? (
                <div className="space-y-3">
                  {threadDetails.slice(0, 3).map((thread: any, index: number) => (
                    <Link
                      key={thread.id || index}
                      href={`/messages/candidate?thread=${thread.id}`}
                      className="flex items-center p-4 bg-slate-50 rounded-xl hover:bg-sky-50 transition-all duration-200 cursor-pointer group border border-transparent hover:border-sky-100"
                    >
                      <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors duration-200 flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-navy-700" />
                      </div>
                      <div className="flex-1 ml-4 min-w-0">
                        <span className="text-navy-900 group-hover:text-navy-700 transition-colors break-words">
                          New message from{' '}
                          <span className="font-semibold">
                            {thread.otherParticipant?.companyName || 
                             `${thread.otherParticipant?.firstName || ''} ${thread.otherParticipant?.lastName || ''}`.trim() || 
                             'employer'}
                          </span>
                        </span>
                      </div>
                      <span className="text-sm text-slate-500 ml-4 flex-shrink-0">
                        {formatTimeAgo(thread.lastMessageAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
                    <MessageSquare className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-navy-900">No recent activity</h3>
                  <p className="text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">Your activity, such as profile views and new messages, will appear here.</p>
                </div>
              )}
            </div>

          </div>

          {/* Quick Actions Sidebar */}
          <div className="hidden lg:block">
            <QuickActionsCard className="sticky top-24" />
          </div>
        </div>
      </div>
      
      {/* Welcome Popup for first-time users */}
      {onboardingModalState === 'open' && (
        <WelcomePopup 
          isVisible={true} 
          onClose={handleCloseWelcomePopup} 
        />
      )}
    </main>
    </>
  );
}
