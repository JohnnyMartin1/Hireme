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

import type { UserProfile } from "@/types/user";

export default function SeekerHomePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [profileViews, setProfileViews] = useState(0);
  const routerToViews = () => {
    router.push('/home/seeker/profile-views');
  };
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [threadDetails, setThreadDetails] = useState<any[]>([]);
  const [completion, setCompletion] = useState<number>(0);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [endorsements, setEndorsements] = useState<any[]>([]);

  const handleCloseWelcomePopup = async () => {
    setShowWelcomePopup(false);
    
    // Mark that the user has seen the welcome popup
    if (user && profile) {
      try {
        await updateDocument('users', user.uid, {
          hasSeenWelcomePopup: true
        });
        
        // Immediately update local profile state to prevent popup from showing again
        setUserProfile(prevProfile => ({
          ...prevProfile,
          hasSeenWelcomePopup: true
        }));
      } catch (error) {
        console.error('Failed to update welcome popup status:', error);
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
      setUserProfile(profile);
      
      // Check if this is the user's first login after email verification
      // Show welcome popup if they just verified their email and haven't seen the welcome popup yet
      if (profile.emailVerified && !profile.hasSeenWelcomePopup && !userProfile?.hasSeenWelcomePopup) {
        setShowWelcomePopup(true);
      }
      
      // compute simple completion metric
      const total = 14;
      let score = 0;
      const p: any = profile;
      if (p.firstName) score++;
      if (p.lastName) score++;
      if (p.headline) score++;
      if (p.school) score++;
      if (p.major) score++;
      if (p.graduationYear) score++;
      if (p.gpa) score++;
      if (p.location) score++;
      if (p.workPreferences && p.workPreferences.length) score++;
      if (p.jobTypes && p.jobTypes.length) score++;
      if (p.skills && p.skills.length) score++;
      if (p.bio) score++;
      if ((p as any).profileImageUrl) score++;
      if ((p as any).resumeUrl) score++;
      setCompletion(Math.round((score / total) * 100));
    }
  }, [user, profile, loading, router]);

  // Track navigation to profile page and auto-close popup
  useEffect(() => {
    // Check if user has navigated to profile and completed it
    if (showWelcomePopup && profile) {
      const profileComplete = profile.firstName && profile.lastName && profile.headline;
      
      // If profile is complete, auto-close the popup and mark as seen
      if (profileComplete) {
        const timer = setTimeout(() => {
          handleCloseWelcomePopup();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [showWelcomePopup, profile]);

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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {(userProfile as any)?.profileImageUrl ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <Image
                    src={(userProfile as any).profileImageUrl}
                    alt={`${profile?.firstName || 'User'}'s profile`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white shadow-lg flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            
            {/* Welcome Text */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {profile?.firstName || 'Job Seeker'}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                {profile?.headline || 'Ready to find your next opportunity?'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Completion Bar */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Profile Completion</p>
            <p className="text-sm text-gray-600">{completion}%</p>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-3 bg-blue-600" style={{ width: `${completion}%` }} />
          </div>
          {completion < 100 && (
            <div className="mt-3 text-sm text-gray-600">
              Complete your profile to get noticed faster.{' '}
              <a href="/account/profile" className="text-blue-600 hover:underline">Finish profile</a>
            </div>
          )}
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/messages/candidate" className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : threads.length}
                </p>
              </div>
            </div>
          </Link>

          <button onClick={routerToViews} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 text-left w-full">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Companies Viewed You</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : profileViews}
                </p>
              </div>
            </div>
          </button>

          <Link href="/endorsements" className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-shadow cursor-pointer">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Endorsements</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : endorsements.length}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/account/profile"
                className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <User className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-blue-800">Edit Profile</span>
              </Link>
              <Link
                href={`/candidate/${user?.uid}`}
                className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Eye className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-green-800">Preview Profile</span>
              </Link>
              <Link
                href="/messages/candidate"
                className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-purple-800">View Messages</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {threadDetails.length > 0 ? (
            <div className="space-y-3">
              {threadDetails.slice(0, 3).map((thread: any, index: number) => (
                <Link
                  key={thread.id || index}
                  href={`/messages/${thread.id}`}
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <MessageSquare className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <span className="text-gray-700">
                      New message from{' '}
                      <span className="font-medium">
                        {thread.otherParticipant?.companyName || 
                         `${thread.otherParticipant?.firstName || ''} ${thread.otherParticipant?.lastName || ''}`.trim() || 
                         'employer'}
                      </span>
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(thread.lastMessageAt)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
              <p className="text-sm text-gray-400">Complete your profile to start receiving messages</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Welcome Popup for first-time users */}
      <WelcomePopup 
        isVisible={showWelcomePopup} 
        onClose={handleCloseWelcomePopup} 
      />
    </main>
  );
}
