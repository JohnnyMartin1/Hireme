"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Building, 
  Search, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Star,
  Heart
} from "lucide-react";
import EmployerJobsList from "@/components/EmployerJobsList";
import { getEmployerJobs, getUserMessageThreads, getProfilesByRole } from '@/lib/firebase-firestore';
import CompanyRatingDisplay from '@/components/CompanyRatingDisplay';

export default function EmployerHomePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    candidates: 0,
    messages: 0,
    activeJobs: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Check if user has the correct role
    if (profile && profile.role !== 'EMPLOYER') {
      if (profile.role === 'JOB_SEEKER') {
        router.push("/home/seeker");
      } else {
        router.push("/admin");
      }
      return;
    }
  }, [user, profile, loading, router]);

  // Fetch stats data
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !profile || profile.role !== 'EMPLOYER') return;

      setIsLoadingStats(true);
      try {
        // Fetch active jobs count
        const { data: jobs, error: jobsError } = await getEmployerJobs(user.uid);
        const activeJobsCount = jobsError ? 0 : (jobs?.length || 0);

        // Fetch message threads count
        const { data: threads, error: threadsError } = await getUserMessageThreads(user.uid);
        const messagesCount = threadsError ? 0 : (threads?.length || 0);

        // Fetch candidates count (all job seekers)
        const { data: candidates, error: candidatesError } = await getProfilesByRole('JOB_SEEKER');
        const candidatesCount = candidatesError ? 0 : (candidates?.length || 0);

        setStats({
          candidates: candidatesCount,
          messages: messagesCount,
          activeJobs: activeJobsCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  // Double-check role before rendering
  if (profile.role !== 'EMPLOYER') {
    return null; // Will redirect to appropriate dashboard
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.companyName || 'Employer'}! 👋
          </h1>
          <p className="text-green-100 text-lg">
            Ready to find your next talented candidate?
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Candidates</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats.candidates}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats.messages}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats.activeJobs}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/search/candidates"
                className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Search className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-green-800">Search Candidates</span>
              </Link>
              <Link
                href="/saved/candidates"
                className="flex items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Heart className="h-5 w-5 text-orange-600 mr-3" />
                <span className="text-orange-800">Saved Candidates</span>
              </Link>
              <Link
                href="/employer/job/new"
                className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Building className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-blue-800">Post New Job</span>
              </Link>
              <Link
                href="/messages"
                className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-purple-800">View Messages</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Profile</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Company Name</span>
                <span className="text-sm font-medium text-gray-900">
                  {profile?.companyName || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="text-sm font-medium text-gray-900">
                  {profile?.createdAt ? 
                    new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="pt-3 border-t">
                <Link
                  href="/account/company"
                  className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Building className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-green-800">Edit Company Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Manage Jobs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Manage Jobs</h3>
            <Link
              href="/employer/job/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Building className="h-4 w-4 mr-2" />
              Post New Job
            </Link>
          </div>
          <EmployerJobsList />
        </div>

        {/* Company Ratings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Ratings</h3>
          <CompanyRatingDisplay employerId={user.uid} showDetails={true} />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400">Start searching for candidates to see activity here</p>
          </div>
        </div>
      </div>
    </main>
  );
}