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
  Heart,
  FileText
} from "lucide-react";
import EmployerJobsList from "@/components/EmployerJobsList";
import { getEmployerJobs, getCompanyJobs, getUserMessageThreads, getProfilesByRole } from '@/lib/firebase-firestore';
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

    // Check if email is verified (using profile data from Firestore)
    if (profile && !profile.emailVerified) {
      router.push("/auth/verify-email");
      return;
    }

    // Check if user has the correct role (EMPLOYER or RECRUITER)
    if (profile && profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
      if (profile.role === 'JOB_SEEKER') {
        router.push("/home/seeker");
      } else {
        router.push("/admin");
      }
      return;
    }

    // Check if company is verified (for employers only)
    if (profile && profile.role === 'EMPLOYER' && profile.status === 'pending_verification') {
      // Show pending verification message but allow access to dashboard
      // The dashboard will show a verification banner
    }
  }, [user, profile, loading, router]);

  // Fetch stats data
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) return;

      setIsLoadingStats(true);
      try {
        // Fetch active jobs count (use company jobs if user has companyId)
        const { data: jobs, error: jobsError } = profile.companyId 
          ? await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false)
          : await getEmployerJobs(user.uid);
        const activeJobsCount = jobsError ? 0 : (jobs?.length || 0);

        // Fetch message threads count
        const { data: threads, error: threadsError } = await getUserMessageThreads(user.uid);
        const messagesCount = threadsError ? 0 : (threads?.length || 0);

        // Candidates reached out to: count unique other participant IDs across threads
        const otherParticipants = new Set<string>();
        if (!threadsError && threads) {
          for (const t of threads as any[]) {
            if (Array.isArray(t.participantIds)) {
              for (const pid of t.participantIds as string[]) {
                if (pid && pid !== user.uid) otherParticipants.add(pid);
              }
            }
          }
        }
        const candidatesCount = otherParticipants.size;

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
      <div className="min-h-screen mobile-safe-top mobile-safe-bottom" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  // Double-check role before rendering
  if (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
    return null; // Will redirect to appropriate dashboard
  }

  const companyName = profile?.companyName || profile?.isCompanyOwner 
    ? (profile?.companyName || 'Your Company') 
    : (profile?.firstName || 'Employer');
  
  const companyInitial = companyName.charAt(0).toUpperCase();
  const isVerified = profile?.status === 'verified' || profile?.role === 'RECRUITER';

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* Welcome Banner */}
        <section className="bg-gradient-to-r from-navy to-blue-900 text-white p-4 sm:p-8 rounded-2xl flex items-center justify-between mb-6 sm:mb-8 shadow-lg">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-light-blue/20 flex items-center justify-center border-4 border-white/30 shadow-lg">
              <span className="text-2xl sm:text-3xl font-bold text-white">{companyInitial}</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Welcome back, {companyName}! 👋</h1>
              <p className="text-blue-200 mt-1 text-sm sm:text-base">Ready to find your next talented candidate?</p>
            </div>
          </div>
        </section>
        
        {/* Verification Banner */}
        {profile?.status === 'pending_verification' && (
          <section className="bg-orange-100/60 border border-orange-200 text-orange-800 p-4 sm:p-6 rounded-2xl flex items-start space-x-3 sm:space-x-4 mb-6 sm:mb-8">
            <div className="text-orange-500 text-lg sm:text-xl mt-1">
              ⚠️
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">Company Verification Pending</h2>
              <p className="text-sm">Your company registration is under review. You'll receive an email notification once approved. Some features may be limited until verification is complete. <a href="#" className="font-semibold underline">Learn more</a></p>
            </div>
          </section>
        )}
        
        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {/* Candidates Card */}
          {isVerified ? (
            <Link href="/employer/candidates-by-job" className="block">
              <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-light-gray card-hover text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-light-blue/30 flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 sm:h-7 sm:w-7 text-navy" />
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-navy">{isLoadingStats ? '...' : stats.candidates}</p>
                <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">Candidates</p>
              </div>
            </Link>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-light-gray text-center opacity-60 cursor-not-allowed" title="Available after verification">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-slate-200 flex items-center justify-center mb-3">
                <Users className="h-5 w-5 sm:h-7 sm:w-7 text-slate-500" />
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-600">0</p>
              <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">Candidates</p>
              <p className="text-xs text-slate-400 mt-1">Available after verification</p>
            </div>
          )}

          {/* Messages Card */}
          <Link href="/messages" className="block">
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-light-gray card-hover text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-light-blue/30 flex items-center justify-center mb-3">
                <MessageSquare className="h-5 w-5 sm:h-7 sm:w-7 text-navy" />
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold text-navy">{isLoadingStats ? '...' : stats.messages}</p>
              <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">Messages</p>
            </div>
          </Link>

          {/* Active Jobs Card */}
          <Link href="/employer/jobs" className="block">
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-light-gray card-hover text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-light-blue/30 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-navy" />
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold text-navy">{isLoadingStats ? '...' : stats.activeJobs}</p>
              <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">Active Jobs</p>
            </div>
          </Link>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            {/* Manage Jobs Card */}
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-8 rounded-2xl shadow-sm border border-light-gray card-hover">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-navy">Manage Jobs</h2>
                <Link
                  href="/employer/job/new"
                  className="bg-navy text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-5 rounded-lg hover:bg-blue-900 transition-colors duration-200 shadow-md hover:shadow-lg flex items-center space-x-2 text-sm sm:text-base"
                >
                  <Building className="h-4 w-4" />
                  <span>Post New Job</span>
                </Link>
              </div>
              <EmployerJobsList />
            </div>

            {/* Company Ratings Card */}
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-8 rounded-2xl shadow-sm border border-light-gray card-hover">
              <h2 className="text-lg sm:text-xl font-bold text-navy mb-4 sm:mb-6">Company Ratings</h2>
              <CompanyRatingDisplay employerId={user.uid} showDetails={true} />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-8">
            {/* Quick Actions Card */}
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-light-gray card-hover">
              <h2 className="text-lg sm:text-xl font-bold text-navy mb-4 sm:mb-5 px-2">Quick Actions</h2>
              <div className="space-y-2">
                {/* Search Candidates */}
                {isVerified ? (
                  <Link
                    href="/search/candidates"
                    className="flex items-center p-3 sm:p-4 rounded-lg action-row-hover"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                      <Search className="h-4 w-4 sm:h-5 sm:w-5 text-navy" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm sm:text-base">Search Candidates</span>
                    <div className="ml-auto">
                      <div className="text-gray-400">›</div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center p-3 sm:p-4 rounded-lg cursor-not-allowed opacity-50" title="Available after company verification">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                      <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                    </div>
                    <div className="flex-grow">
                      <span className="font-semibold text-gray-500 text-sm sm:text-base">Search Candidates</span>
                      <span className="text-xs text-gray-400 block">Available after verification</span>
                    </div>
                    <div className="ml-auto">
                      <div className="text-gray-400">🔒</div>
                    </div>
                  </div>
                )}

                {/* View Messages */}
                <Link
                  href="/messages"
                  className="flex items-center p-3 sm:p-4 rounded-lg action-row-hover"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-navy" />
                  </div>
                  <span className="font-semibold text-gray-700 text-sm sm:text-base">View Messages</span>
                  <div className="ml-auto">
                    <div className="text-gray-400">›</div>
                  </div>
                </Link>

                {/* Post New Job */}
                <Link
                  href="/employer/job/new"
                  className="flex items-center p-3 sm:p-4 rounded-lg action-row-hover"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5 text-navy" />
                  </div>
                  <span className="font-semibold text-gray-700 text-sm sm:text-base">Post New Job</span>
                  <div className="ml-auto">
                    <div className="text-gray-400">›</div>
                  </div>
                </Link>

                {/* Get Verified - only show if pending */}
                {profile?.status === 'pending_verification' && (
                  <Link
                    href="/account/company"
                    className="flex items-center p-3 sm:p-4 rounded-lg bg-yellow-100/60 hover:bg-yellow-100"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-200/80 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-700" />
                    </div>
                    <span className="font-semibold text-yellow-800 text-sm sm:text-base">Get Verified</span>
                    <div className="ml-auto">
                      <div className="text-yellow-600">›</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Company Profile Card */}
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-light-gray card-hover">
              <h2 className="text-lg sm:text-xl font-bold text-navy mb-4 sm:mb-5 px-2">Company Profile</h2>
              <div className="space-y-4">
                <div className="px-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Company Name</label>
                  <p className="font-semibold text-gray-800 flex items-center mt-1 text-sm sm:text-base">
                    {companyName}
                    {profile?.status === 'pending_verification' && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">Pending</span>
                    )}
                  </p>
                </div>
                
                {/* Edit Company Profile */}
                {profile?.isCompanyOwner ? (
                  <Link
                    href="/account/company"
                    className="flex items-center p-3 sm:p-4 rounded-lg action-row-hover"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-navy" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm sm:text-base">Edit Company Profile</span>
                    <div className="ml-auto">
                      <div className="text-gray-400">›</div>
                    </div>
                  </Link>
                ) : (
                  <Link
                    href="/company/view"
                    className="flex items-center p-3 sm:p-4 rounded-lg action-row-hover"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-navy" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm sm:text-base">View Company Profile</span>
                    <div className="ml-auto">
                      <div className="text-gray-400">›</div>
                    </div>
                  </Link>
                )}

                {/* Manage Recruiters */}
                {profile?.isCompanyOwner && (
                  <Link
                    href="/company/manage/recruiters"
                    className="flex items-center p-3 sm:p-4 rounded-lg action-row-hover"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-light-blue/30 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-navy" />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm sm:text-base">Manage Recruiters</span>
                    <div className="ml-auto">
                      <div className="text-gray-400">›</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}