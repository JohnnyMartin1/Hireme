"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TurnViewsIntoInterviewsPage() {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/home/seeker/profile-views"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm hidden sm:inline">Back to Profile Views</span>
            <span className="font-medium text-sm sm:hidden">Back</span>
          </Link>
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-navy-900 mb-3 break-words">
              Turn Profile Views Into Interviews
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              When an employer views your profile, it means they're interested. The difference between a view and an interview usually comes down to clarity, credibility, and follow-up.
            </p>
          </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 md:p-10">
          <div className="prose prose-slate max-w-none">
            {/* Introduction */}
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-8">
              Use the steps below to convert attention into real conversations.
            </p>

            {/* Step 1 */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4 flex items-center">
                <span className="bg-navy-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">1</span>
                Make Your First Impression Obvious
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Employers scan profiles quickly. Your goal is to make it immediately clear who you are, what roles you're targeting, and why you're qualified.
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 sm:p-5 mb-4">
                <h3 className="font-semibold text-navy-900 mb-3">What to check:</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                  <li>Your headline clearly states your target role or role type</li>
                  <li>Your experience highlights outcomes, not just responsibilities</li>
                  <li>Your strongest skills or interests appear at the top of your profile</li>
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-navy-900">Why this matters:</strong> If an employer can't understand your fit in the first few seconds, they're unlikely to reach out—even if your background is strong.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4 flex items-center">
                <span className="bg-navy-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">2</span>
                Remove Friction for Employers
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                The easier it is for an employer to evaluate and share your profile internally, the more likely you are to move forward.
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 sm:p-5 mb-4">
                <h3 className="font-semibold text-navy-900 mb-3">Make sure you have:</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                  <li>A resume uploaded and easy to view</li>
                  <li>At least one project, experience, or concrete example</li>
                  <li>Clean formatting that's easy to scan</li>
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-navy-900">Why this matters:</strong> Hiring managers often forward profiles to teammates. Missing files or unclear information can stop that process entirely.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4 flex items-center">
                <span className="bg-navy-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">3</span>
                Show Proof, Not Just Potential
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Employers look for evidence that you can do the work—not just that you're interested.
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 sm:p-5 mb-4">
                <h3 className="font-semibold text-navy-900 mb-3">Ways to strengthen your profile:</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                  <li>Add measurable results where possible (numbers, outcomes, impact)</li>
                  <li>Upload a short introduction video to provide context and personality</li>
                  <li>Request at least one endorsement from someone who knows your work</li>
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-navy-900">Why this matters:</strong> Proof builds trust. Even small signals of credibility can dramatically increase response rates.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4 flex items-center">
                <span className="bg-navy-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">4</span>
                Follow Up the Right Way
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If employers have viewed your profile, a short, professional follow-up can turn passive interest into a conversation.
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 sm:p-5 mb-4">
                <h3 className="font-semibold text-navy-900 mb-3">Guidelines for a good follow-up:</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2 mb-4">
                  <li>Keep it brief and specific</li>
                  <li>Reference the role or type of work you're interested in</li>
                  <li>Offer a clear next step (not a long explanation)</li>
                </ul>
                <div className="mt-4">
                  <h4 className="font-semibold text-navy-900 mb-2">Example message:</h4>
                  <div className="bg-white border border-slate-300 rounded-lg p-4 text-sm text-slate-700 leading-relaxed italic">
                    Hi — I noticed your team viewed my profile. I'm actively interested in entry-level roles related to my background and would love to learn more about what you're looking for. If helpful, I'm happy to share additional examples or set up a quick call.
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-navy-900">Why this works:</strong> It shows initiative without pressure and gives the employer an easy way to respond.
                </p>
              </div>
            </div>

            {/* What Employers Usually Look At First */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4">
                What Employers Usually Look At First
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Most employers review profiles in under a minute. These are the sections they tend to check first:
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 sm:p-5">
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                  <li>Headline and target role clarity</li>
                  <li>Resume or work examples</li>
                  <li>Recent experience and skills</li>
                  <li>Signals of credibility (endorsements, results, projects)</li>
                  <li>How easy it is to follow up or learn more</li>
                </ul>
                <p className="text-slate-700 leading-relaxed mt-4">
                  Optimizing these areas significantly increases your chances of being contacted.
                </p>
              </div>
            </div>

            {/* Common Reasons */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4">
                Common Reasons Candidates Don't Hear Back
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Even strong candidates can miss opportunities due to small issues:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                  <li>No resume or broken file uploads</li>
                  <li>Unclear target role or "open to anything" messaging</li>
                  <li>Experience listed without results or context</li>
                  <li>Incomplete profile sections</li>
                  <li>No indication of availability or interest in next steps</li>
                </ul>
                <p className="text-slate-700 leading-relaxed mt-4">
                  Fixing just one or two of these can materially improve your outcomes.
                </p>
              </div>
            </div>

            {/* Your Next Best Move */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4">
                Your Next Best Move
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If employers are viewing your profile but not reaching out, focus on:
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 sm:p-5 mb-4">
                <ul className="list-disc list-inside space-y-2 text-slate-700 ml-2">
                  <li>Completing the most important missing profile sections</li>
                  <li>Adding one strong piece of proof (resume, project, or endorsement)</li>
                  <li>Sending a short, thoughtful follow-up</li>
                </ul>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Small improvements compound quickly.
              </p>
            </div>

            {/* Final Thought */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4">
                Final Thought
              </h2>
              <p className="text-slate-700 leading-relaxed text-base sm:text-lg">
                Profile views are a signal. With a clear profile, credible proof, and a simple follow-up, that signal can turn into interviews. Keep your profile focused, make it easy for employers to evaluate you, and take initiative when the opportunity is there.
              </p>
            </div>
          </div>
        </div>

        </div>
      </main>
    </div>
  );
}
