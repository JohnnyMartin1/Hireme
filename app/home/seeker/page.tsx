"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  User, 
  MessageSquare, 
  Eye, 
  Calendar,
  MapPin,
  Star
} from "lucide-react";
import { getUserMessageThreads, getProfileViewCount, getDocument } from '@/lib/firebase-firestore';

import type { UserProfile } from "@/types/user";

export default function SeekerHomePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [profileViews, setProfileViews] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [threadDetails, setThreadDetails] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
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
    }
  }, [user, profile, loading, router]);

  // Fetch real-time data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setIsLoadingStats(true);
      try {
        // Fetch message threads
        const { data: threadsData, error: threadsError } = await getUserMessageThreads(user.uid);
        
        if (!threadsError && threadsData) {
          setThreads(threadsData);
          
          // Fetch details for each thread (other participant info)
          const threadDetailsPromises = threadsData.map(async (thread: any) => {
            const otherParticipantId = thread.participantIds.find((id: string) => id !== user.uid);
            if (otherParticipantId) {
              const { data: otherProfile, error: profileError } = await getDocument('users', otherParticipantId);
              return {
                ...thread,
                otherParticipant: profileError ? null : otherProfile
              };
            }
            return thread;
          });
          
          const threadDetailsData = await Promise.all(threadDetailsPromises);
          setThreadDetails(threadDetailsData);
        }

        // Fetch profile view count
        const { count, error: viewsError } = await getProfileViewCount(user.uid);
        
        if (!viewsError) {
          setProfileViews(count);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Helper function to format time difference
  const formatTimeAgo = (timestamp: any) => {
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
  };

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
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.firstName || 'Job Seeker'}! 👋
          </h1>
          <p className="text-blue-100 text-lg">
            {profile?.headline || 'Ready to find your next opportunity?'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
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
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profile Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : profileViews}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Skills</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : (profile?.skills?.length || 0)}
                </p>
              </div>
            </div>
          </div>
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
    </main>
  );
}
