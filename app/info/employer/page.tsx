"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Rocket, Users, Briefcase, Star, Shield, DollarSign, CheckCircle, Eye, MessageSquare, Heart, Building2 } from "lucide-react";
import Link from "next/link";

export default function EmployerInfoPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (profile && profile.role !== 'EMPLOYER') {
      router.push("/home/employer");
      return;
    }
  }, [user, profile, loading, router]);

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
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link 
          href="/home/employer"
          className="text-blue-600 hover:underline flex items-center space-x-1 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 md:p-12 mb-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Rocket className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold">Welcome to HireMe for Employers!</h1>
          </div>
          <p className="text-xl text-blue-50 leading-relaxed">
            We're excited to have you on board! HireMe was built to make hiring <strong>faster, smarter, and more human</strong> — so you can skip messy inboxes, endless resumes, and focus only on the candidates who actually fit your jobs.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* How It Works Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Rocket className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">How HireMe Works</h2>
            </div>

            {/* Step 1: Candidates */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Candidates Complete Detailed Profiles
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Every candidate on HireMe fills out a comprehensive profile including:
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Education, experience, and key skills</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Resume, portfolio, and social profiles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Short video introduction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Verified contact information</span>
                    </div>
                  </div>
                  <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Pro Tip:</strong> Candidates appreciate personalized outreach. Reviewing their video and background before messaging helps build stronger, faster connections.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Company Profile */}
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    Set Up Your Company Profile
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Start by visiting <Link href="/account/company" className="text-purple-600 font-semibold hover:underline">Edit Company Profile</Link> to upload your:
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Banner image and company logo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Location, industry, and size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Website and company bio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Social media and contact info</span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">
                    This is what candidates see when your team contacts them — so make it professional and engaging.
                  </p>
                  <p className="text-gray-700">
                    You can also invite your hiring team under <Link href="/company/manage/recruiters" className="text-purple-600 font-semibold hover:underline">Manage Recruiters</Link>. Simply enter their emails, and they'll automatically be linked to your company account to collaborate on job postings and candidate outreach.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Post Jobs */}
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-600" />
                    Post a Job Before Reaching Out
                  </h3>
                  <p className="text-gray-700 mb-4">
                    <strong>Recruiters must have at least one active job posting before messaging candidates.</strong> This ensures that every outreach is tied to a legitimate opportunity, creating a transparent and trustworthy experience for everyone.
                  </p>
                  <p className="text-gray-700 mb-4">Once a job is posted, recruiters can:</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Eye className="h-5 w-5 text-green-600 mt-1" />
                      <span className="text-gray-700">Search for ideal candidates using detailed filters (skills, education, experience, etc.)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-green-600 mt-1" />
                      <span className="text-gray-700">Reach out directly to candidates with the job posting attached</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Heart className="h-5 w-5 text-green-600 mt-1" />
                      <span className="text-gray-700">Save standout candidates to review or contact later</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Dashboard */}
            <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-l-4 border-orange-500">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-600" />
                    Manage Everything from Your Dashboard
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Your dashboard gives you a snapshot of your company's hiring activity:
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Total candidates contacted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Active job postings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Messages sent and received</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Linked recruiters and their activity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Candidate ratings of your company</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-gray-700">Overall company performance metrics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quality & Accountability */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Quality and Accountability on Both Sides</h2>
            </div>
            <p className="text-gray-700 mb-6">
              At HireMe, we hold both companies and candidates to a high standard to keep the experience efficient and rewarding.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Star className="h-6 w-6 text-blue-600" />
                  <h3 className="font-bold text-gray-900">Employer Ratings</h3>
                </div>
                <p className="text-gray-700">
                  Candidates rate companies after receiving outreach, helping us ensure employers communicate clearly and professionally.
                </p>
              </div>
              <div className="p-6 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                  <h3 className="font-bold text-gray-900">Candidate Quality</h3>
                </div>
                <p className="text-gray-700">
                  We monitor candidate responsiveness — any candidates who consistently ignore messages or fail to reply are removed from the platform.
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg">
              <p className="text-gray-800 font-semibold text-center">
                ✨ This means you'll only ever see top-quality, active, and responsive candidates — no ghost profiles or wasted outreach!
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-xl p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Subscription & Fees</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold mb-2">Monthly Subscription</h3>
                <p className="text-4xl font-bold mb-4">$300<span className="text-lg font-normal">/month</span></p>
                <p className="text-blue-100">
                  Full access to job posting, recruiter management, and candidate search features.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold mb-2">Finder's Fee</h3>
                <p className="text-4xl font-bold mb-4">$1,000<span className="text-lg font-normal">/hire</span></p>
                <p className="text-blue-100">
                  Only paid when a candidate you connect with through HireMe is officially hired.
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <p className="text-sm text-center">
                💼 <strong>Success-Based Pricing:</strong> You only pay the finder's fee when you successfully hire someone through our platform!
              </p>
            </div>
          </div>

          {/* Getting Started CTA */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">🎯 You're Ready to Start!</h2>
              <p className="text-gray-600 text-lg">
                Follow these steps to begin hiring confidently on HireMe:
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Link 
                href="/account/company"
                className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-gray-900">Set up your Company Profile</h3>
                </div>
                <p className="text-sm text-gray-600">Make a great first impression</p>
              </Link>
              
              <Link 
                href="/company/manage/recruiters"
                className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-gray-900">Invite your Recruiters</h3>
                </div>
                <p className="text-sm text-gray-600">Build your hiring team</p>
              </Link>
              
              <Link 
                href="/employer/job/new"
                className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-gray-900">Post your first job</h3>
                </div>
                <p className="text-sm text-gray-600">Start attracting candidates</p>
              </Link>
              
              <Link 
                href="/search/candidates"
                className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-gray-900">Start connecting with candidates</h3>
                </div>
                <p className="text-sm text-gray-600">Find your perfect hire</p>
              </Link>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white text-center">
              <p className="text-lg font-semibold">
                HireMe gives you everything you need to hire confidently — transparent profiles, direct outreach, and a trusted environment that respects everyone's time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

