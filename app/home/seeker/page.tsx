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
  Star
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
  const routerToViews = () => {
    router.push('/home/seeker/profile-views');
  };
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [threadDetails, setThreadDetails] = useState<any[]>([]);
  // Tri-state for modal visibility to prevent flicker
  const [onboardingModalState, setOnboardingModalState] = useState<'unknown' | 'open' | 'closed'>('unknown');
  const [endorsements, setEndorsements] = useState<any[]>([]);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            
            {/* Welcome Banner */}
            <section className="bg-gradient-to-r from-navy to-blue-900 text-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-center justify-between shadow-lg">
              <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6 w-full sm:w-auto">
                {(() => {
                  console.log('Rendering profile image:', userProfile?.profileImageUrl);
                  return userProfile?.profileImageUrl ? (
                    <Image
                      src={userProfile.profileImageUrl}
                      alt={`${profile?.firstName || 'User'}'s avatar`}
                      width={80}
                      height={80}
                      className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-4 border-white/30 shadow-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-4 border-white/30 shadow-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white" />
                    </div>
                  );
                })()}
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold break-words">Welcome back, {profile?.firstName || 'Job Seeker'}! 👋</h1>
                  <p className="text-blue-200 mt-1 text-xs sm:text-sm md:text-base">Here's your dashboard overview for today.</p>
                </div>
              </div>
            </section>

            {/* Profile Completion Card */}
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-light-gray hover:shadow-lg transition-all duration-200">
              <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-navy">Profile Completion</h2>
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-navy bg-light-blue/30 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full flex-shrink-0">{completion}%</span>
              </div>
              <div className="w-full bg-light-gray/50 rounded-full h-2.5 sm:h-3 mb-3 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-navy to-light-blue h-2.5 sm:h-3 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm break-words">
                Complete your profile to increase your visibility to top employers.{' '}
                <a href="/account/profile" className="font-semibold text-navy hover:underline decoration-2 underline-offset-2 cursor-pointer">Finish profile →</a>
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
              <Link href="/messages/candidate" className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-light-gray hover:shadow-lg transition-all duration-200 text-center group min-h-[120px] sm:min-h-[140px] flex flex-col justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-light-blue/30 flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-navy" />
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-navy">{isLoadingStats ? '...' : threads.length}</p>
                <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">Messages</p>
              </Link>

              <button onClick={routerToViews} className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-light-gray hover:shadow-lg transition-all duration-200 text-center group w-full min-h-[120px] sm:min-h-[140px] flex flex-col justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-light-blue/30 flex items-center justify-center mb-3">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-navy" />
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-navy">{isLoadingStats ? '...' : profileViews}</p>
                <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">Companies Viewed You</p>
              </button>

              <Link href="/endorsements" className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-light-gray hover:shadow-lg transition-all duration-200 text-center group relative min-h-[120px] sm:min-h-[140px] flex flex-col justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-light-blue/30 flex items-center justify-center mb-3 relative">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-navy" />
                  {!isLoadingStats && endorsements.length === 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-navy">{isLoadingStats ? '...' : endorsements.length}</p>
                <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">Endorsements</p>
              </Link>
            </div>

            {/* Endorsement Promo Card */}
            {!isLoadingStats && endorsements.length === 0 && (
              <div className="bg-light-blue/20 backdrop-blur-sm p-5 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-light-blue/30 hover:shadow-lg transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6 text-navy" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-navy">Get Your First Endorsement!</h3>
                    <p className="text-sm sm:text-base text-navy/80">Boost your profile credibility and stand out from the crowd.</p>
                  </div>
                </div>
                <Link
                  href="/endorsements"
                  className="bg-navy text-white font-semibold py-2.5 sm:py-3 px-5 sm:px-6 rounded-lg hover:bg-blue-900 transition-colors duration-200 shadow-md hover:shadow-lg text-center min-h-[44px] flex items-center justify-center w-full sm:w-auto"
                >
                  Get Endorsements
                </Link>
              </div>
            )}

            {/* Recent Activity Card */}
            <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-light-gray hover:shadow-lg transition-all duration-200">
              <h2 className="text-lg sm:text-xl font-bold text-navy mb-4 sm:mb-6">Recent Activity</h2>
              {threadDetails.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {threadDetails.slice(0, 3).map((thread: any, index: number) => (
                    <Link
                      key={thread.id || index}
                      href={`/messages/candidate?thread=${thread.id}`}
                      className="flex items-center p-3 sm:p-4 bg-slate-50 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-all duration-200 cursor-pointer group min-h-[64px]"
                    >
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200 flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors duration-200" />
                      </div>
                      <div className="flex-1 ml-3 sm:ml-4 min-w-0">
                        <span className="text-sm sm:text-base text-slate-700 group-hover:text-slate-900 transition-colors duration-200 break-words">
                          New message from{' '}
                          <span className="font-medium group-hover:text-blue-600 transition-colors duration-200">
                            {thread.otherParticipant?.companyName || 
                             `${thread.otherParticipant?.firstName || ''} ${thread.otherParticipant?.lastName || ''}`.trim() || 
                             'employer'}
                          </span>
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500 group-hover:text-slate-700 transition-colors duration-200 ml-2 flex-shrink-0">
                        {formatTimeAgo(thread.lastMessageAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-700">No recent activity</h3>
                  <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-sm mx-auto px-4">Your activity, such as profile views and new messages, will appear here.</p>
                </div>
              )}
            </div>

          </div>

          {/* Quick Actions Sidebar */}
          <div className="col-span-12 lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-light-gray hover:shadow-lg transition-all duration-200 lg:sticky lg:top-28">
              <h2 className="text-lg sm:text-xl font-bold text-navy mb-4 sm:mb-5 px-2">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/account/profile" className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-light-blue/20 active:bg-light-blue/30 transition-all duration-200 cursor-pointer group min-h-[56px]">
                  <div className="w-10 h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <User className="h-5 w-5 text-navy" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-gray-700">Edit Profile</span>
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-r-2 border-b-2 border-gray-400 rotate-45"></div>
                  </div>
                </Link>
                <Link href={`/candidate/${user?.uid}`} className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-light-blue/20 active:bg-light-blue/30 transition-all duration-200 cursor-pointer group min-h-[56px]">
                  <div className="w-10 h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <Eye className="h-5 w-5 text-navy" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-gray-700">Preview Profile</span>
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-r-2 border-b-2 border-gray-400 rotate-45"></div>
                  </div>
                </Link>
                <Link href="/messages/candidate" className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-light-blue/20 active:bg-light-blue/30 transition-all duration-200 cursor-pointer group min-h-[56px]">
                  <div className="w-10 h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-navy" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-gray-700">View Messages</span>
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-r-2 border-b-2 border-gray-400 rotate-45"></div>
                  </div>
                </Link>
                <Link href="/endorsements" className="flex items-center p-3 sm:p-4 rounded-lg hover:bg-light-blue/20 active:bg-light-blue/30 transition-all duration-200 cursor-pointer group min-h-[56px]">
                  <div className="w-10 h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <Star className="h-5 w-5 text-navy" />
                  </div>
                  <div className="flex-grow">
                    <span className="font-semibold text-sm sm:text-base text-gray-700">Endorsements</span>
                    {!isLoadingStats && endorsements.length === 0 && (
                      <span className="block text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full w-fit mt-1">Recommended</span>
                    )}
                  </div>
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-r-2 border-b-2 border-gray-400 rotate-45"></div>
                  </div>
                </Link>
              </div>
            </div>
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
  );
}
