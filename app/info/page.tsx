"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, CheckCircle, Shield, Star, Video, Search, MessageSquare, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function InfoPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Redirect non-candidates to their dashboard
    if (profile && profile.role !== 'JOB_SEEKER') {
      if (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') {
        router.push("/home/employer");
      } else {
        router.push("/");
      }
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

  if (!user || !profile || profile.role !== 'JOB_SEEKER') {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6 py-12">
        <Link 
          href="/home/seeker"
          className="inline-flex items-center px-4 py-2 bg-blue-50 text-navy-800 rounded-full hover:bg-blue-100 hover:shadow-sm transition-all duration-200 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 md:p-12 mb-8 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How It Works — Candidates
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 leading-relaxed">
            Flip the hiring script. Build your profile once—then let companies come to you.
          </p>
        </div>

        {/* Step 1 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-blue-500">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Create your profile (one and done)
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                Tell us who you are and what you want. The more complete your profile, the higher you'll show up in searches—and the more outreach you'll get. Adding a quick video intro is a game-changer (it helps teams meet you, not just read you).
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">Pro tip:</p>
                    <p className="text-blue-800">
                      Finished profiles get surfaced more, messaged more, and interviewed faster.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-green-500">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Get discovered (no applications, ever)
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                Once your profile is complete, you're discoverable. Hiring teams search, find you, and reach out directly to set up a first-round interview.
              </p>
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3 text-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-medium">No portals</span>
                </div>
                <div className="flex items-center gap-3 text-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-medium">No cover letters</span>
                </div>
                <div className="flex items-center gap-3 text-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-medium">No "submit and pray"</span>
                </div>
              </div>
              <p className="text-gray-600 mt-4 text-lg">
                You just wait for the messages to roll in.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-purple-500">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Interview & choose
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Reply to the opportunities you like, book interviews, and move forward on your terms.
              </p>
            </div>
          </div>
        </div>

        {/* Trust & Safety */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-8 mb-6 border-2 border-amber-200">
          <div className="flex items-start gap-4 mb-4">
            <Shield className="h-10 w-10 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Trust & Safety (your time matters)
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 text-lg leading-relaxed">
                    <span className="font-semibold">Every company is screened</span> before they can contact candidates—no scammy companies slipping into your inbox like on other sites.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-700 text-lg leading-relaxed">
                    <span className="font-semibold">Company reviews by candidates.</span> If a role is "ghosty" or a team doesn't follow through, it gets flagged and reflected in their rating. Repeat offenders are investigated and removed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Want More Invites? */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-lg p-8 mb-6 border-2 border-indigo-200">
          <div className="flex items-start gap-4 mb-4">
            <TrendingUp className="h-10 w-10 text-indigo-600 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Want more invites?
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm">
                  <CheckCircle className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                  <span className="text-gray-800 font-medium">Finish everything in your profile (yes, everything)</span>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm">
                  <Video className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                  <span className="text-gray-800 font-medium">Add the video (0–30 seconds, friendly and clear)</span>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                  <span className="text-gray-800 font-medium">Keep it fresh with new skills, projects, and wins</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Line CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Bottom line
          </h2>
          <p className="text-xl text-blue-100 leading-relaxed mb-6">
            Complete your profile, kick back, and let the interviews come to you.
          </p>
          <Link
            href="/account/profile"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <CheckCircle className="h-6 w-6 mr-2" />
            Complete Your Profile
          </Link>
        </div>
      </div>
    </main>
  );
}

