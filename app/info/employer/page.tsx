"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        .card-hover {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(173, 216, 230, 0.15), 0 3px 6px rgba(173, 216, 230, 0.1);
        }
        .action-tile-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .action-tile-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(173, 216, 230, 0.12);
        }
        .action-tile-hover:active {
          transform: translateY(-1px);
        }
        .fade-up {
          opacity: 0;
          transform: translateY(12px);
          animation: fadeUp 220ms ease-out forwards;
        }
        .fade-up-delay-1 { animation-delay: 50ms; }
        .fade-up-delay-2 { animation-delay: 100ms; }
        .fade-up-delay-3 { animation-delay: 150ms; }
        .fade-up-delay-4 { animation-delay: 200ms; }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hero-pulse {
          animation: heroPulse 1.5s ease-out;
        }
        @keyframes heroPulse {
          0% { transform: scale(1); }
          15% { transform: scale(1.05); }
          30% { transform: scale(1); }
          100% { transform: scale(1); }
        }
        .number-badge {
          animation: numberReveal 180ms ease-out forwards;
          opacity: 0;
          transform: scale(0.8);
        }
        @keyframes numberReveal {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-up, .hero-pulse, .number-badge, .card-hover, .action-tile-hover {
            animation: none;
            transition: none;
          }
        }
      `}</style>

      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <Link href="/home/employer" className="flex items-center space-x-2 text-navy-800 hover:text-sky-400 transition-colors duration-200">
                <i className="fa-solid fa-arrow-left"></i>
                <span className="font-semibold">Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-navy-800 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-magnifying-glass text-white text-lg"></i>
              </div>
              <span className="text-2xl font-bold text-navy">HireMe</span>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-screen" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)'}}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">

          {/* Welcome Hero */}
          <section className="fade-up">
            <div className="bg-gradient-to-r from-navy-800 to-sky-400 text-white p-10 rounded-3xl shadow-lg">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center hero-pulse">
                  <i className="fa-solid fa-building text-3xl text-white"></i>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-3">Welcome, Employers</h1>
                  <p className="text-blue-100 text-lg leading-relaxed max-w-2xl">
                    HireMe connects you with talented early-career professionals through our streamlined, 
                    transparent hiring process. Here's everything you need to know to get started.
                  </p>
                  <div className="mt-4">
                    <a href="#how-it-works" className="text-blue-200 hover:text-white font-semibold underline decoration-2 underline-offset-4 transition-colors">
                      Learn more below →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="space-y-8">
            <h2 className="text-3xl font-bold text-navy-800 text-center mb-10">How HireMe Works</h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 card-hover fade-up">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-navy-800 text-white rounded-full flex items-center justify-center font-bold text-lg number-badge" style={{animationDelay: '100ms'}}>1</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy-800 mb-3">Set Up Your Company Profile</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Create your <strong>company profile</strong> with detailed information</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Upload <strong>company branding</strong> and culture photos</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Define your <strong>hiring criteria</strong> and job requirements</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 bg-sky-200/20 rounded-lg border-l-4 border-navy">
                      <span className="text-sm font-semibold text-navy">💡 Pro Tip: Complete profiles receive 3x more candidate responses</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 card-hover fade-up fade-up-delay-1">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-sky-200 text-white rounded-full flex items-center justify-center font-bold text-lg number-badge" style={{animationDelay: '150ms'}}>2</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy-800 mb-3">Search Verified Candidate Database</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Browse <strong>verified and standardized profiles</strong> from our database</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Use <strong>advanced filters</strong> for skills, education, and experience</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Access <strong>AI-powered matching</strong> for optimal candidate recommendations</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 bg-sky-200/20 rounded-lg border-l-4 border-light-blue">
                      <span className="text-sm font-semibold text-navy">✨ Pro Tip: Our verification process ensures you connect with serious, qualified candidates</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 card-hover fade-up fade-up-delay-2">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-navy-800 text-white rounded-full flex items-center justify-center font-bold text-lg number-badge" style={{animationDelay: '200ms'}}>3</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy-800 mb-3">Direct Messaging & Timeline Tracking</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Send <strong>direct messages</strong> to candidates through our secure platform</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Track your <strong>hiring timeline</strong> and application progress in real-time</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Maintain <strong>transparent communication</strong> throughout the process</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 bg-sky-200/20 rounded-lg border-l-4 border-light-blue">
                      <span className="text-sm font-semibold text-navy">🚀 Pro Tip: Fast, transparent communication leads to better hiring outcomes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 card-hover fade-up fade-up-delay-3">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-sky-200 text-white rounded-full flex items-center justify-center font-bold text-lg number-badge" style={{animationDelay: '250ms'}}>4</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy-800 mb-3">Efficient & Balanced Hiring Process</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Experience a <strong>fast and efficient</strong> hiring process</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Benefit from <strong>balanced and fair</strong> experiences for both parties</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <i className="fa-solid fa-check text-sky-400 text-sm"></i>
                        <span>Build <strong>long-term professional relationships</strong> with top talent</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 bg-navy/10 rounded-lg border-l-4 border-navy">
                      <span className="text-sm font-semibold text-navy">🎯 Pro Tip: Our platform revolutionizes hiring by putting employers in control of candidate discovery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quality & Accountability */}
          <section className="fade-up fade-up-delay-1">
            <h2 className="text-3xl font-bold text-navy-800 text-center mb-10">Quality & Accountability</h2>
            
            <div className="bg-white/90 backdrop-blur-sm p-10 rounded-2xl shadow-sm border border-slate-200 card-hover">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-sky-200/30 rounded-xl flex items-center justify-center mb-4">
                    <i className="fa-solid fa-star text-navy-800 text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-navy">Employer Ratings</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Candidates can rate their experience with your company, helping you build a strong 
                    employer brand and attract top talent through authentic feedback and transparency.
                  </p>
                  <div className="p-4 bg-sky-200/20 rounded-lg border border-light-blue/30">
                    <p className="text-sm font-semibold text-navy-800 flex items-center space-x-2">
                      <span>✨</span>
                      <span>This means you'll build trust and credibility with future candidates</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 bg-sky-200/30 rounded-xl flex items-center justify-center mb-4">
                    <i className="fa-solid fa-shield-check text-navy-800 text-xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-navy">Candidate Quality</h3>
                  <p className="text-gray-700 leading-relaxed">
                    All candidates go through our verification process, including education confirmation 
                    and skill assessments, ensuring you connect with qualified, serious job seekers.
                  </p>
                  <div className="p-4 bg-sky-200/20 rounded-lg border border-light-blue/30">
                    <p className="text-sm font-semibold text-navy-800 flex items-center space-x-2">
                      <span>✨</span>
                      <span>This means less time screening and more time finding the right fit</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Subscription & Fees */}
          <section className="fade-up fade-up-delay-2">
            <h2 className="text-3xl font-bold text-navy-800 text-center mb-10">Subscription & Fees</h2>
            
            <div className="bg-gradient-to-r from-navy-800 to-sky-400 p-10 rounded-2xl shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                    <i className="fa-solid fa-calendar-days text-white text-xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Monthly Subscription</h3>
                  <p className="text-4xl font-bold text-white mb-2">$199<span className="text-lg font-normal">/month</span></p>
                  <p className="text-blue-100">Unlimited access to our candidate database and messaging platform.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                    <i className="fa-solid fa-handshake text-white text-xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Finder's Fee</h3>
                  <p className="text-4xl font-bold text-white mb-2">15%<span className="text-lg font-normal"> of salary</span></p>
                  <p className="text-blue-100">Only pay when you successfully hire a candidate through our platform.</p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-sky-200/20 rounded-xl border border-light-blue/30">
                <p className="text-white font-semibold flex items-center space-x-3">
                  <i className="fa-solid fa-check text-white"></i>
                  <span>Success-Based Pricing: Choose the model that works best for your hiring needs</span>
                </p>
              </div>
            </div>
          </section>

          {/* Ready to Start */}
          <section className="fade-up fade-up-delay-3">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-navy-800 mb-4">You're Ready to Start! ❤️</h2>
              <p className="text-gray-600 text-lg">Complete these steps to begin finding your next great hire</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200 action-tile-hover cursor-pointer">
                <div className="w-12 h-12 bg-sky-200/30 rounded-xl flex items-center justify-center mb-4">
                  <i className="fa-solid fa-building text-navy-800 text-xl"></i>
                </div>
                <h3 className="font-bold text-navy-800 mb-2">Set up your Company Profile</h3>
                <p className="text-gray-600 text-sm">Add your company details and culture information</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200 action-tile-hover cursor-pointer">
                <div className="w-12 h-12 bg-sky-200/30 rounded-xl flex items-center justify-center mb-4">
                  <i className="fa-solid fa-users text-navy-800 text-xl"></i>
                </div>
                <h3 className="font-bold text-navy-800 mb-2">Invite your Recruiters</h3>
                <p className="text-gray-600 text-sm">Add team members to collaborate on hiring</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200 action-tile-hover cursor-pointer">
                <div className="w-12 h-12 bg-sky-200/30 rounded-xl flex items-center justify-center mb-4">
                  <i className="fa-solid fa-briefcase text-navy-800 text-xl"></i>
                </div>
                <h3 className="font-bold text-navy-800 mb-2">Post your first job</h3>
                <p className="text-gray-600 text-sm">Create a job listing to attract candidates</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200 action-tile-hover cursor-pointer">
                <div className="w-12 h-12 bg-sky-200/30 rounded-xl flex items-center justify-center mb-4">
                  <i className="fa-solid fa-comments text-navy-800 text-xl"></i>
                </div>
                <h3 className="font-bold text-navy-800 mb-2">Start connecting with candidates</h3>
                <p className="text-gray-600 text-sm">Browse profiles and send messages</p>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center space-x-3 bg-sky-200/30 px-8 py-4 rounded-full border border-light-blue/50">
                <i className="fa-solid fa-heart text-navy"></i>
                <span className="font-semibold text-navy">HireMe gives you everything you need to hire with confidence</span>
              </div>
            </div>
          </section>

          {/* About Platform */}
          <section className="fade-up fade-up-delay-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-navy-800 mb-4">About HireMe Platform 🚀</h2>
              <p className="text-gray-600 text-lg">Understanding our comprehensive hiring ecosystem</p>
            </div>

            <div className="space-y-8">
              {/* Revolutionary Process */}
              <div className="bg-white/90 backdrop-blur-sm p-10 rounded-2xl shadow-sm border border-slate-200 card-hover">
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-sky-200/30 rounded-2xl flex items-center justify-center">
                    <i className="fa-solid fa-rocket text-navy-800 text-2xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-navy-800 mb-4">Revolutionary Hiring Process</h3>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      HireMe revolutionizes traditional hiring by empowering employers to discover talent from our database of verified, standardized profiles. Instead of candidates seeking employers, we enable you to find the perfect match through direct search and AI-powered recommendations. Our platform ensures fast, transparent communication while providing a balanced experience for both parties.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-sky-200/20 rounded-lg border-l-4 border-navy">
                        <p className="text-sm font-semibold text-navy">✅ Direct messaging capabilities</p>
                      </div>
                      <div className="p-4 bg-sky-200/20 rounded-lg border-l-4 border-light-blue">
                        <p className="text-sm font-semibold text-navy">📈 Hiring timeline tracking</p>
                      </div>
                      <div className="p-4 bg-sky-200/20 rounded-lg border-l-4 border-navy">
                        <p className="text-sm font-semibold text-navy">🔒 Safe and efficient process</p>
                      </div>
                      <div className="p-4 bg-sky-200/20 rounded-lg border-l-4 border-light-blue">
                        <p className="text-sm font-semibold text-navy">⚖️ Balanced experience for all</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Navigation */}
              <div className="bg-white/90 backdrop-blur-sm p-10 rounded-2xl shadow-sm border border-slate-200 card-hover">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-navy-800 mb-4 flex items-center space-x-3">
                    <i className="fa-solid fa-compass text-navy"></i>
                    <span>Platform Navigation</span>
                  </h3>
                  <p className="text-gray-700">Explore all areas of the HireMe ecosystem designed for seamless hiring</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-navy-800 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-home text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Landing Page</h4>
                    <p className="text-xs text-gray-600 mt-1">Your starting point</p>
                  </div>

                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-sky-200 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-user text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Candidate Dashboard</h4>
                    <p className="text-xs text-gray-600 mt-1">Job seeker hub</p>
                  </div>

                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-navy-800 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-building text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Employer Dashboard</h4>
                    <p className="text-xs text-gray-600 mt-1">Hiring command center</p>
                  </div>

                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-sky-200 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-id-card text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Candidate Profile</h4>
                    <p className="text-xs text-gray-600 mt-1">Detailed profiles</p>
                  </div>

                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-navy-800 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-search text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Search Results</h4>
                    <p className="text-xs text-gray-600 mt-1">Find candidates</p>
                  </div>

                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-sky-200 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-comments text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Messaging</h4>
                    <p className="text-xs text-gray-600 mt-1">Direct communication</p>
                  </div>

                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-navy-800 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-timeline text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Timeline/Progress</h4>
                    <p className="text-xs text-gray-600 mt-1">Track hiring stages</p>
                  </div>

                  <div className="p-4 bg-sky-200/20 rounded-xl border border-slate-200 action-tile-hover cursor-pointer">
                    <div className="w-10 h-10 bg-sky-200 rounded-lg flex items-center justify-center mb-3">
                      <i className="fa-solid fa-cog text-white"></i>
                    </div>
                    <h4 className="font-bold text-navy-800 text-sm">Settings</h4>
                    <p className="text-xs text-gray-600 mt-1">Customize experience</p>
                  </div>
                </div>
              </div>

              {/* Design & Accessibility */}
              <div className="bg-white/90 backdrop-blur-sm p-10 rounded-2xl shadow-sm border border-slate-200 card-hover">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-navy-800 mb-4 flex items-center space-x-3">
                    <i className="fa-solid fa-palette text-navy"></i>
                    <span>Design & Accessibility Standards</span>
                  </h3>
                  <p className="text-gray-700">Built with professional reliability and user-friendly clarity in mind</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-sky-200/20 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-navy-800 mb-3 flex items-center space-x-2">
                        <i className="fa-solid fa-swatchbook text-navy"></i>
                        <span>Color System</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-navy-800 rounded-full border-2 border-white shadow-sm"></div>
                          <span className="text-sm"><strong>Navy Blue:</strong> Reliability & professionalism</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-sky-200 rounded-full border-2 border-white shadow-sm"></div>
                          <span className="text-sm"><strong>Light Blue:</strong> Clarity & ease-of-use</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-white rounded-full border-2 border-slate-200 shadow-sm"></div>
                          <span className="text-sm"><strong>White:</strong> Clean text & backgrounds</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-sky-200/20 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-navy-800 mb-3 flex items-center space-x-2">
                        <i className="fa-solid fa-universal-access text-navy"></i>
                        <span>Accessibility Features</span>
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>High contrast ratios for readability</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>Consistent 20px padding for touch targets</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>Modern sans-serif typography</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-sky-200/20 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-navy-800 mb-3 flex items-center space-x-2">
                        <i className="fa-solid fa-mobile-alt text-navy"></i>
                        <span>Responsive Design</span>
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>Light and dark mode compatibility</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>Optimized for all screen sizes</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>Intuitive navigation elements</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-6 bg-sky-200/20 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-navy-800 mb-3 flex items-center space-x-2">
                        <i className="fa-solid fa-shield-check text-navy"></i>
                        <span>Quality Standards</span>
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>No technical jargon in user interface</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>Clear visual hierarchy and content flow</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <i className="fa-solid fa-check text-sky-400 text-xs"></i>
                          <span>Purposeful design enhancements only</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
