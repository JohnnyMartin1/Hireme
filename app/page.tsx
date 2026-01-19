"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import HireMeLogo from "@/components/brand/HireMeLogo";
import MobileNav from "@/components/mobile/MobileNav";

export default function Home() {
  const { user, profile, signOut } = useFirebaseAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine dashboard link based on user role
  const dashboardLink = profile?.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER'
    ? '/home/employer'
    : '/';

  // Comparison table state
  const [comparisonView, setComparisonView] = useState<'employer' | 'candidate'>('candidate');
  
  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Workflow hover state
  const [hoveredWorkflowIndex, setHoveredWorkflowIndex] = useState<number | null>(null);
  
  // Get in Touch email display state
  const [showEmail, setShowEmail] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Position workflow nodes on mount
  useEffect(() => {
    const nodes = ['source', 'screen', 'interview', 'decide', 'onboard', 'measure'];
    const radius = 158;
    const angleStep = 360 / 6;

    nodes.forEach((node, i) => {
      const element = document.getElementById(`node-${node}`);
      if (element) {
        const baseAngle = i * angleStep;
        const angleRad = (baseAngle - 90) * (Math.PI / 180);
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        element.style.position = 'absolute';
        element.style.top = '50%';
        element.style.left = '50%';
        element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
    });
  }, []);

  const workflowSteps = [
    { id: 'source', icon: 'fa-search', title: 'Source Candidates', description: 'Discover talent from multiple channels. AI-powered matching ensures you find the right people fast.' },
    { id: 'screen', icon: 'fa-filter', title: 'Screen & Qualify', description: 'Automated resume parsing and skills assessment filter out unqualified candidates.' },
    { id: 'interview', icon: 'fa-calendar-check', title: 'Interview & Evaluate', description: 'Structured interview guides and shared scorecards keep everyone aligned.' },
    { id: 'decide', icon: 'fa-check-circle', title: 'Make Decisions', description: 'Collaborative decision-making with transparent scoring. Compare candidates side-by-side.' },
    { id: 'onboard', icon: 'fa-rocket', title: 'Onboard & Engage', description: 'Send digital offer letters, automate paperwork, and create personalized onboarding experiences.' },
    { id: 'measure', icon: 'fa-chart-bar', title: 'Measure & Improve', description: 'Track hiring metrics and feedback to continuously improve sourcing, screening, and interview quality.' }
  ];

  // Comparison content with truth-safe states - Separate for employer and candidate views
  const comparisonRowsByView = {
    employer: [
      {
        key: "outreach_messaging",
        group: "Core capabilities",
        label: "Outreach messaging",
        description: "Message candidates directly and manage conversations in one place.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: "built_in",
          indeed: "built_in",
        },
        highlight: false,
      },
      {
        key: "young_professionals",
        group: "Core capabilities",
        label: "Designed for young professionals / early careers",
        description: "Platform optimized for finding and connecting with early-career talent and recent graduates.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: "built_in",
          indeed: false,
        },
        highlight: false,
      },
      {
        key: "talent_discovery",
        group: "Core capabilities",
        label: "Talent discovery: search & filters",
        description: "Search and filter for candidates by role-relevant criteria to build targeted shortlists.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: "built_in",
          indeed: false,
        },
        highlight: false,
      },
      {
        key: "transparent_timelines",
        group: "Quality & Trust",
        label: "Transparent timelines & status updates (anti-ghosting)",
        description: "Set clear stages and expected response windows so candidates know what's next and when updates will happen.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: false,
          indeed: false,
        },
        highlight: true,
      },
      {
        key: "noise_reduction",
        group: "Quality & Trust",
        label: "Noise reduction: verified ecosystem + lower third-party recruiter/spam",
        description: "Verified ecosystem with quality controls that reduce spam and ensure high-signal outreach.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: "built_in",
          indeed: false,
        },
        highlight: true,
      },
      {
        key: "standardized_template",
        group: "Quality & Trust",
        label: "Standardized candidate template (market yourself; no guessing)",
        description: "Consistent profile format makes it easier to evaluate candidates fairly and efficiently.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: false,
          indeed: false,
        },
        highlight: false,
      },
      {
        key: "employer_led_model",
        group: "Differentiators",
        label: "Employer-led hiring model (employers find you)",
        description: "Search, discover, and reach out to candidates proactively — no waiting for applications.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: false,
          indeed: false,
        },
        highlight: true,
      },
      {
        key: "no_resume_pile",
        group: "Differentiators",
        label: "No resume pile (no mass applying)",
        description: "Quality candidates, not volume. No sifting through hundreds of generic applications.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: false,
          indeed: false,
        },
        highlight: true,
      },
    ],
    candidate: [
      {
        key: "guided_profile",
        group: "Core capabilities",
        label: "Guided profile setup",
        description: "Step-by-step guidance to create a complete, professional profile.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: "built_in",
          indeed: "built_in",
        },
        highlight: false,
      },
      {
        key: "high_signal_profile",
        group: "Core capabilities",
        label: "High-signal candidate profile",
        description: "Showcase your skills, experience, and achievements in a structured format.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: "built_in",
          indeed: false,
        },
        highlight: false,
      },
      {
        key: "verified_endorsements",
        group: "Core capabilities",
        label: "Verified endorsements",
        description: "Get endorsements from colleagues, managers, and peers to validate your skills.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: false,
          indeed: false,
        },
        highlight: false,
      },
      {
        key: "profile_views",
        group: "Core capabilities",
        label: "Profile view visibility",
        description: "See which employers have viewed your profile to track interest.",
        states: {
          hireme: "built_in",
          linkedin: "built_in",
          handshake: false,
          indeed: false,
        },
        highlight: false,
      },
      {
        key: "verified_employers",
        group: "Quality & Trust",
        label: "Verified employers (screened before outreach)",
        description: "Only hear from verified, legitimate employers — no scammy companies.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: "built_in",
          indeed: false,
        },
        highlight: true,
      },
      {
        key: "real_jobs_only",
        group: "Quality & Trust",
        label: "Real jobs only (outreach tied to an active opening)",
        description: "Every outreach is connected to a real, active job opportunity.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: "built_in",
          indeed: false,
        },
        highlight: true,
      },
      {
        key: "video_introductions",
        group: "Differentiators",
        label: "Video introductions",
        description: "Stand out with a video introduction that showcases your personality and communication skills.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: false,
          indeed: false,
        },
        highlight: true,
      },
      {
        key: "one_and_done",
        group: "Differentiators",
        label: "One-and-done setup (set it once; no application grind)",
        description: "Build your profile once — employers find and reach out to you. No endless application forms.",
        states: {
          hireme: "built_in",
          linkedin: false,
          handshake: false,
          indeed: false,
        },
        highlight: true,
      },
    ],
  };

  const comparisonCopy = {
    employer: {
      title: "How HireMe Compares",
      subtitle: "All the essentials employers expect — plus verified intent and clearer timelines.",
    },
    candidate: {
      title: "How HireMe Compares",
      subtitle: "All the essentials candidates expect — plus fewer dead ends and higher-signal outreach.",
    },
  };

  // Transform comparisonRowsByView into the format expected by the rendering code
  const comparisonData = {
    employer: (() => {
      const rows = comparisonRowsByView.employer;
      const groups = Array.from(new Set(rows.map(r => r.group)));
      return groups.map(group => ({
        group,
        rows: rows
          .filter(r => r.group === group)
          .map(row => ({
            key: row.key,
            label: row.label,
            description: row.description,
            hireme: row.states.hireme === "built_in" || row.states.hireme === "available",
            linkedin: row.states.linkedin === "built_in" || row.states.linkedin === "available",
            handshake: row.states.handshake === "built_in" || row.states.handshake === "available",
            indeed: row.states.indeed === "built_in" || row.states.indeed === "available",
            highlight: row.highlight,
          })),
      }));
    })(),
    candidate: (() => {
      const rows = comparisonRowsByView.candidate;
      const groups = Array.from(new Set(rows.map(r => r.group)));
      return groups.map(group => ({
        group,
        rows: rows
          .filter(r => r.group === group)
          .map(row => ({
            key: row.key,
            label: row.label,
            description: row.description,
            hireme: row.states.hireme === "built_in" || row.states.hireme === "available",
            linkedin: row.states.linkedin === "built_in" || row.states.linkedin === "available",
            handshake: row.states.handshake === "built_in" || row.states.handshake === "available",
            indeed: row.states.indeed === "built_in" || row.states.indeed === "available",
            highlight: row.highlight,
          })),
      }));
    })(),
  };

  const faqItems = [
    {
      question: "What do I need to set up an applicant account?",
      answer: "Setting up an applicant account is quick and straightforward. At a minimum, you'll upload your resume, and you can optionally include a transcript to help employers better understand your background. From there, you can enhance your profile with skills, interests, and availability — all designed to help employers find you faster without lengthy applications."
    },
    {
      question: "How do employers start searching for candidates?",
      answer: "Employers create a verified account and define what they're looking for — role type, skills, availability, and hiring timeline. From there, HireMe surfaces qualified, early-career candidates automatically, allowing employers to search, filter, and connect without posting a job or waiting weeks for applications."
    },
    {
      question: "How is HireMe different from LinkedIn or Handshake?",
      answer: "HireMe flips the traditional job search. Instead of candidates applying endlessly, verified employers actively search for early-career talent. This reduces ghosting, speeds up hiring, and creates more transparent, intentional connections on both sides."
    },
    {
      question: "Are employers on HireMe verified?",
      answer: "Yes. Employers must complete a verification process before searching or contacting candidates. This helps ensure legitimate opportunities and more meaningful conversations."
    },
    {
      question: "Is HireMe only for students or recent graduates?",
      answer: "HireMe is built for early-career talent — including students, recent graduates, and individuals exploring entry-level or rotational roles."
    },
    {
      question: "What happens after an employer reaches out?",
      answer: "Once an employer initiates contact, both parties can communicate directly, schedule interviews, and move forward — all without unnecessary steps or intermediaries."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes slideLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes slideRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        @keyframes workflowPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(186, 230, 253, 0.4);
          }
          50% {
            transform: scale(1.12);
            box-shadow: 0 0 40px rgba(186, 230, 253, 0.8);
          }
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(186, 230, 253, 0.6);
          }
          50% {
            box-shadow: 0 0 40px rgba(186, 230, 253, 1);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
          }
          50% {
            box-shadow: 0 4px 20px rgba(30, 58, 138, 0.5), 0 0 30px rgba(186, 230, 253, 0.4);
          }
        }

        @keyframes nodePop {
          0% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.3);
          }
          100% {
            filter: brightness(1.15);
          }
        }

        @keyframes nodeGlow {
          0%, 100% {
            box-shadow: 0 0 40px rgba(56, 189, 248, 0.7), 0 0 60px rgba(186, 230, 253, 0.5), 0 8px 32px rgba(0, 0, 0, 0.25);
          }
          50% {
            box-shadow: 0 0 60px rgba(56, 189, 248, 0.9), 0 0 100px rgba(186, 230, 253, 0.7), 0 12px 48px rgba(0, 0, 0, 0.3);
          }
        }

        .skyline-scroll {
          animation: slideLeft 60s linear infinite;
          will-change: transform;
        }

        .skyline-scroll-reverse {
          animation: slideRight 120s linear infinite;
          will-change: transform;
        }

        .card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-hover:hover {
          transform: translateY(-10px);
          box-shadow: 0 24px 48px rgba(16, 42, 67, 0.12);
        }

        html {
          scroll-behavior: smooth;
        }

        a:focus, button:focus {
          outline: 2px solid #bae6fd;
          outline-offset: 2px;
          border-radius: 4px;
        }

        /* Feature Card Styles */
        .feature-card__content {
          position: relative;
          z-index: 3;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Layer 1: mesh/aurora gradient with slow drift - Adapted to HireMe Sky/Navy Palette */
        .feature-card::before {
          content: "";
          position: absolute;
          inset: -40%;
          z-index: 1;
          background:
            radial-gradient(40% 40% at 20% 20%, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0) 60%),
            radial-gradient(45% 45% at 80% 30%, rgba(56, 189, 248, 0.10) 0%, rgba(56, 189, 248, 0) 55%),
            radial-gradient(50% 50% at 45% 85%, rgba(186, 230, 253, 0.15) 0%, rgba(186, 230, 253, 0) 60%),
            radial-gradient(45% 45% at 85% 85%, rgba(15, 23, 42, 0.05) 0%, rgba(15, 23, 42, 0) 55%);
          filter: blur(10px);
          transform: translate3d(0, 0, 0);
          animation: aurora-drift 18s ease-in-out infinite;
          opacity: 0.9;
        }

        /* Layer 2: diagonal hatch (darker/clearer) */
        .feature-card::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 2;
          background-image:
            repeating-linear-gradient(135deg,
              rgba(15, 23, 42, 0.08) 0px,
              rgba(15, 23, 42, 0.08) 1.2px,
              rgba(15, 23, 42, 0) 1.2px,
              rgba(15, 23, 42, 0) 16px
            );
          opacity: 0.6;
          mix-blend-mode: multiply;
          animation: hatch-drift 22s linear infinite;
          transform: translate3d(0, 0, 0);
        }

        /* Hover polish */
        .feature-card:hover {
          box-shadow: 0 22px 70px rgba(15, 23, 42, 0.15);
          transform: translateY(-4px);
        }

        /* Icon Badge Animation */
        @keyframes float-badge {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .icon-badge {
          animation: float-badge 6s ease-in-out infinite;
        }

        /* Animations */
        @keyframes aurora-drift {
          0% {
            transform: translate(-2%, -2%) scale(1.02);
          }
          50% {
            transform: translate(2%, 1%) scale(1.06);
          }
          100% {
            transform: translate(-2%, -2%) scale(1.02);
          }
        }

        @keyframes hatch-drift {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 120px 120px;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .feature-card::before,
          .feature-card::after,
          .icon-badge {
            animation: none;
          }
          .feature-card {
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-50">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <Link href="/" className="shrink-0" aria-label="HireMe home">
              <HireMeLogo variant="full" className="h-7 sm:h-8 w-auto" />
            </Link>

            {!user ? (
              <>
                {/* Desktop Navigation - Not Logged In */}
                <nav className="hidden md:flex items-center space-x-2 lg:space-x-3">
                  <a href="#personas" className="text-sm text-slate-600 hover:text-navy-700 font-medium transition-all duration-200 px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md hover:scale-105">For Teams</a>
                  <a href="#workflows" className="text-sm text-slate-600 hover:text-navy-700 font-medium transition-all duration-200 px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md hover:scale-105">Workflows</a>
                  <a href="#comparison" className="text-sm text-slate-600 hover:text-navy-700 font-medium transition-all duration-200 px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md hover:scale-105">Comparison</a>
                  <a href="#features" className="text-sm text-slate-600 hover:text-navy-700 font-medium transition-all duration-200 px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md hover:scale-105">Features</a>
                  <a href="#faq" className="text-sm text-slate-600 hover:text-navy-700 font-medium transition-all duration-200 px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md hover:scale-105">FAQ</a>
                </nav>
                <div className="flex items-center space-x-3">
                  <Link href="/auth/login" className="text-sm text-slate-700 hover:text-navy-700 font-medium transition-colors duration-200">Log In</Link>
                  <Link href="/auth/signup" className="bg-navy-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-navy-700 hover:shadow-lg transition-all duration-300">Sign Up</Link>
                </div>
              </>
            ) : (
              <>
                {/* Desktop Navigation - Logged In */}
                <nav className="hidden md:flex items-center gap-3 lg:gap-4">
                  <Link 
                    href={dashboardLink}
                    className="text-sm text-navy-900 hover:text-navy-700 font-semibold px-4 py-2 rounded-lg hover:bg-sky-50 transition-all duration-200"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href={`/account/${user?.uid}/settings`}
                    className="text-sm text-navy-900 hover:text-navy-700 font-semibold px-4 py-2 rounded-lg hover:bg-sky-50 transition-all duration-200"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={signOut}
                    className="text-sm text-navy-900 hover:text-navy-700 font-semibold px-4 py-2 rounded-lg hover:bg-sky-50 transition-all duration-200"
                  >
                    Sign out
                  </button>
                </nav>

                {/* Mobile Hamburger Button - Logged In */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMobileMenuOpen(true);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  className="md:hidden p-2.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-50 relative touch-manipulation"
                  aria-label="Open menu"
                  aria-expanded={mobileMenuOpen}
                  type="button"
                >
                  <Menu className="h-6 w-6 text-slate-700 pointer-events-none" />
                </button>

                {/* Mobile Menu - Logged In */}
                <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
                  <nav className="flex flex-col w-full">
                    <Link 
                      href={dashboardLink}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center px-4 py-4 text-base font-medium text-navy-900 hover:bg-sky-50 active:bg-sky-100 transition-colors border-b border-slate-100 min-h-[56px] w-full text-center"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href={`/account/${user?.uid}/settings`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center px-4 py-4 text-base font-medium text-navy-900 hover:bg-sky-50 active:bg-sky-100 transition-colors border-b border-slate-100 min-h-[56px] w-full text-center"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                      className="flex items-center justify-center px-4 py-4 text-base font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors w-full min-h-[56px] text-center"
                    >
                      Sign out
                    </button>
                  </nav>
                </MobileNav>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-24 pb-32 lg:pb-40 overflow-hidden bg-sky-50 min-h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-slate-50"></div>
          
          {/* Skyline Animation - Multiple Layers */}
          <div className="absolute bottom-0 left-0 right-0 h-80 overflow-hidden pointer-events-none">
            {/* Back layer - taller, slower, more transparent */}
            <div className="skyline-scroll-reverse flex absolute bottom-0 opacity-[0.15]">
              {(() => {
                const colorPattern = ['bg-navy-300', 'bg-sky-200', 'bg-navy-400', 'bg-sky-300', 'bg-navy-200', 'bg-sky-200', 'bg-navy-300', 'bg-sky-300', 'bg-navy-200', 'bg-sky-200', 'bg-navy-400', 'bg-sky-300'];
                const heights = [280, 320, 300, 290, 270, 310, 275, 295, 260, 245, 285, 305, 265, 315, 255, 300, 290, 280, 270, 310, 285, 295, 275, 265, 255, 320, 300, 290, 275, 285];
                return (
                  <>
                    <div className="flex items-end gap-14">
                      {heights.map((h, i) => (
                        <div 
                          key={`back-1-${i}`} 
                          className={`rounded-t-sm ${colorPattern[i % colorPattern.length]}`}
                          style={{ 
                            width: i % 3 === 0 ? '44px' : i % 3 === 1 ? '38px' : '50px',
                            height: `${h}px`,
                            flexShrink: 0
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-end gap-14">
                      {heights.map((h, i) => (
                        <div 
                          key={`back-2-${i}`} 
                          className={`rounded-t-sm ${colorPattern[i % colorPattern.length]}`}
                          style={{ 
                            width: i % 3 === 0 ? '44px' : i % 3 === 1 ? '38px' : '50px',
                            height: `${h}px`,
                            flexShrink: 0
                          }}
                        />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* Middle layer */}
            <div className="skyline-scroll flex absolute bottom-0 opacity-[0.2]" style={{ animationDuration: '80s' }}>
              {(() => {
                const colorPattern = ['bg-navy-300', 'bg-sky-200', 'bg-navy-400', 'bg-sky-300', 'bg-navy-200', 'bg-sky-200', 'bg-navy-300', 'bg-sky-300', 'bg-navy-200'];
                const heights = [220, 200, 250, 170, 240, 190, 230, 205, 215, 225, 195, 245, 175, 235, 185, 225, 210, 200, 220, 195, 235, 205, 225, 195, 215, 240, 220, 210];
                return (
                  <>
                    <div className="flex items-end gap-16">
                      {heights.map((h, i) => (
                        <div 
                          key={`mid-1-${i}`} 
                          className={`rounded-t-sm ${colorPattern[i % colorPattern.length]}`}
                          style={{ 
                            width: i % 2 === 0 ? '32px' : '40px',
                            height: `${h}px`,
                            flexShrink: 0
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-end gap-16">
                      {heights.map((h, i) => (
                        <div 
                          key={`mid-2-${i}`} 
                          className={`rounded-t-sm ${colorPattern[i % colorPattern.length]}`}
                          style={{ 
                            width: i % 2 === 0 ? '32px' : '40px',
                            height: `${h}px`,
                            flexShrink: 0
                          }}
                        />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* Front layer - shorter, faster, more visible */}
            <div className="skyline-scroll flex absolute bottom-0 opacity-[0.25]" style={{ animationDuration: '50s' }}>
              {(() => {
                const colorPattern = ['bg-navy-200', 'bg-sky-200', 'bg-navy-300', 'bg-sky-300', 'bg-navy-200', 'bg-sky-200', 'bg-navy-300', 'bg-sky-300', 'bg-navy-200', 'bg-sky-200'];
                const heights = [130, 110, 140, 120, 135, 115, 145, 108, 138, 118, 128, 125, 132, 118, 142, 113, 133, 123, 128, 138, 118, 143, 128, 133, 118, 138, 128, 123, 135, 125];
                return (
                  <>
                    <div className="flex items-end gap-10">
                      {heights.map((h, i) => (
                        <div 
                          key={`front-1-${i}`} 
                          className={`rounded-t-sm ${colorPattern[i % colorPattern.length]}`}
                          style={{ 
                            width: i % 2 === 0 ? '26px' : '34px',
                            height: `${h}px`,
                            flexShrink: 0
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-end gap-10">
                      {heights.map((h, i) => (
                        <div 
                          key={`front-2-${i}`} 
                          className={`rounded-t-sm ${colorPattern[i % colorPattern.length]}`}
                          style={{ 
                            width: i % 2 === 0 ? '26px' : '34px',
                            height: `${h}px`,
                            flexShrink: 0
                          }}
                        />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full flex items-center">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 leading-tight mb-4 tracking-tight">
                The Complete Hiring System That
                <span className="block text-navy-600 mt-1">Closes The Loop</span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 mb-6 leading-relaxed">
                HireMe isn't just another job board. It's an end-to-end hiring platform that connects sourcing, screening, collaboration, and onboarding into one seamless workflow.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button 
                  onClick={() => {
                    const element = document.getElementById('personas');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="bg-navy-800 text-white px-7 py-3 rounded-lg font-semibold text-base hover:bg-navy-700 hover:shadow-xl transition-all duration-300 flex items-center space-x-2 shadow-lg cursor-pointer"
                >
                  <span>Get Started</span>
                  <i className="fa-solid fa-arrow-down text-sm animate-bounce"></i>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Personas Section */}
        <section id="personas" className="py-16 lg:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 lg:mb-14">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">Built For Everyone</h2>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Whether you're a solo recruiter, a growing startup, or an enterprise HR team.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {/* Candidates Card */}
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 lg:p-7 card-hover text-center shadow-sm flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fa-solid fa-user-tie text-navy-800 text-2xl"></i>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-navy-900 mb-3">Candidates</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Manage multiple roles, track candidate pipelines, and collaborate with hiring managers.
                </p>
                <ul className="text-left space-y-2 mb-5 flex-grow">
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Pipeline management</span>
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Candidate tracking</span>
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Automated workflows</span>
                  </li>
                </ul>
                <Link href="/auth/signup/seeker" className="inline-block bg-navy-50 text-navy-800 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-navy-100 transition-all duration-200 mt-auto">Get Started</Link>
              </div>

              {/* Employer Card */}
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 lg:p-7 card-hover text-center shadow-sm flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fa-solid fa-building text-navy-800 text-2xl"></i>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-navy-900 mb-3">Employer</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Review candidates, provide feedback, and make hiring decisions with full context.
                </p>
                <ul className="text-left space-y-2 mb-5 flex-grow">
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Shared scorecards</span>
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Real-time updates</span>
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Collaborative feedback</span>
                  </li>
                </ul>
                <Link href="/auth/signup/employer/company" className="inline-block bg-navy-50 text-navy-800 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-navy-100 transition-all duration-200 mt-auto">Get Started</Link>
              </div>

              {/* Recruiters Card */}
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 lg:p-7 card-hover text-center shadow-sm md:col-span-2 lg:col-span-1 flex flex-col">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fa-solid fa-chart-line text-navy-800 text-2xl"></i>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-navy-900 mb-3">Recruiters</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Get visibility into every hiring metric that matters. Track performance and identify bottlenecks.
                </p>
                <ul className="text-left space-y-2 mb-5 flex-grow">
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Compliance tracking</span>
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                    <span>Team performance</span>
                  </li>
                </ul>
                <Link href="/auth/signup/employer/recruiter" className="inline-block bg-navy-50 text-navy-800 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-navy-100 transition-all duration-200 mt-auto">Get Started</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Workflows Section */}
        <section id="workflows" className="py-16 lg:py-20 bg-slate-50 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">Flexible Hiring Workflows</h2>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                HireMe isn't a job board. It's a closed-loop hiring system where everything connects.
              </p>
            </div>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="w-full lg:w-1/2 space-y-4">
                {workflowSteps.map((step, index) => {
                  const isHovered = hoveredWorkflowIndex === index;
                  
                  return (
                    <div 
                      key={step.id} 
                      id={`step-${step.id}`} 
                      className={`transition-all duration-300 cursor-pointer ${isHovered ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                      onMouseEnter={() => setHoveredWorkflowIndex(index)}
                      onMouseLeave={() => setHoveredWorkflowIndex(null)}
                    >
                      <div className={`flex items-start space-x-3 p-4 rounded-xl transition-all duration-300 ${
                        isHovered 
                          ? 'bg-white shadow-lg' 
                          : 'hover:bg-white/50'
                      }`}>
                        <div 
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            isHovered 
                              ? 'bg-gradient-to-br from-navy-600 to-navy-700' 
                              : 'bg-gradient-to-br from-sky-100 to-sky-50 shadow-sm'
                          }`}
                          style={isHovered ? { animation: 'iconPulse 2s ease-in-out infinite' } : {}}
                        >
                          <i className={`fa-solid ${step.icon} text-base transition-colors duration-300 ${
                            isHovered ? 'text-white' : 'text-navy-700'
                          }`}></i>
                        </div>
                        <div>
                          <h3 className="text-lg lg:text-xl font-bold text-navy-900 mb-2">{step.title}</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="w-full lg:w-1/2 flex items-center justify-center">
                <div className="relative w-[300px] h-[300px] lg:w-[375px] lg:h-[375px]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-navy-800 to-navy-900 rounded-full flex items-center justify-center shadow-2xl z-10">
                      <i className="fa-solid fa-users text-white text-3xl"></i>
                    </div>
                  </div>
                  <div className="absolute inset-0 border-2 border-dashed border-sky-200 rounded-full"></div>

                  {workflowSteps.map((step, index) => {
                    const isHovered = hoveredWorkflowIndex === index;
                    
                    return (
                      <div
                        key={step.id}
                        id={`node-${step.id}`}
                        className={`absolute w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-pointer text-white ${
                          isHovered 
                            ? 'z-20 bg-gradient-to-br from-sky-300 via-sky-400 to-cyan-500' 
                            : 'hover:brightness-110'
                        } ${
                          !isHovered && (index === 0 || index === 4)
                            ? 'bg-gradient-to-br from-sky-400 to-sky-500'
                            : !isHovered ? 'bg-gradient-to-br from-navy-500 to-navy-600' : ''
                        }`}
                        style={{
                          boxShadow: isHovered 
                            ? '0 0 50px rgba(56, 189, 248, 0.9), 0 0 80px rgba(186, 230, 253, 0.7), 0 10px 40px rgba(0, 0, 0, 0.3)' 
                            : '0 3px 9px rgba(0, 0, 0, 0.1)',
                          animation: isHovered ? 'nodeGlow 1.5s ease-in-out infinite' : 'none',
                          transform: isHovered ? undefined : undefined,
                          transition: 'box-shadow 0.2s ease-out, background 0.2s ease-out'
                        }}
                        onMouseEnter={() => setHoveredWorkflowIndex(index)}
                        onMouseLeave={() => setHoveredWorkflowIndex(null)}
                      >
                        <i className={`fa-solid ${step.icon} mb-0.5 transition-all duration-200 ${isHovered ? 'text-2xl drop-shadow-lg' : 'text-lg'}`}></i>
                        <span className={`font-bold transition-all duration-200 ${isHovered ? 'text-[11px] drop-shadow-md' : 'text-[10px]'}`}>{step.title.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section id="comparison" className="py-16 lg:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 lg:mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">{comparisonCopy[comparisonView].title}</h2>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto mb-6 leading-relaxed">
                {comparisonCopy[comparisonView].subtitle}
              </p>
              <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 shadow-sm border border-slate-200">
                <button
                  onClick={() => setComparisonView('employer')}
                  className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                    comparisonView === 'employer'
                      ? 'bg-navy-800 text-white shadow-md'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Employer View
                </button>
                <button
                  onClick={() => setComparisonView('candidate')}
                  className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                    comparisonView === 'candidate'
                      ? 'bg-navy-800 text-white shadow-md'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Candidate View
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="sticky left-0 z-20 bg-white py-4 px-4 text-left font-bold text-navy-900 text-base border-r-2 border-slate-200 shadow-sm">
                        Feature
                      </th>
                      <th className="py-4 px-4 text-center border-r-2 border-sky-100 bg-gradient-to-b from-sky-50 to-white">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-navy-800 to-navy-900 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            <i className="fa-solid fa-star text-sky-300 text-xs"></i>
                            <span>Best</span>
                          </div>
                          <span className="font-bold text-navy-900 text-base">HireMe</span>
                        </div>
                      </th>
                      <th className="py-4 px-4 text-center border-r-2 border-slate-200 bg-white">
                        <span className="font-semibold text-slate-700 text-sm">LinkedIn</span>
                      </th>
                      <th className="py-4 px-4 text-center border-r-2 border-slate-200 bg-white">
                        <span className="font-semibold text-slate-700 text-sm">Handshake</span>
                      </th>
                      <th className="py-4 px-4 text-center bg-white">
                        <span className="font-semibold text-slate-700 text-sm">Indeed</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData[comparisonView].map((section, sectionIndex) => (
                      <React.Fragment key={sectionIndex}>
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="py-2 px-4 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                            {section.group}
                          </td>
                        </tr>
                        {section.rows.map((row, rowIndex) => (
                          <tr key={row.key} className="border-b border-slate-100 hover:bg-sky-50/30 transition-colors duration-200">
                            <td className="sticky left-0 z-10 bg-white py-4 px-4 border-r-2 border-slate-200 shadow-sm">
                              <div className="font-semibold text-navy-900 mb-1 text-sm">{row.label}</div>
                              <div className="text-xs text-slate-600 leading-relaxed">{row.description}</div>
                            </td>
                            <td className={`py-4 px-4 text-center border-r-2 border-sky-100 ${row.highlight ? 'bg-sky-50/50 relative' : 'bg-sky-50/30'}`}>
                              <i className={`fa-solid ${row.hireme ? 'fa-check text-green-500' : 'fa-times text-red-500'} text-xl transition-transform duration-300 ${row.highlight ? 'group-hover:scale-110' : ''}`}></i>
                            </td>
                            <td className="py-4 px-4 text-center border-r-2 border-slate-200 bg-white">
                              <i className={`fa-solid ${row.linkedin ? 'fa-check text-green-500' : 'fa-times text-red-500'} text-xl`}></i>
                            </td>
                            <td className="py-4 px-4 text-center border-r-2 border-slate-200 bg-white">
                              <i className={`fa-solid ${row.handshake ? 'fa-check text-green-500' : 'fa-times text-red-500'} text-xl`}></i>
                            </td>
                            <td className="py-4 px-4 text-center bg-white">
                              <i className={`fa-solid ${row.indeed ? 'fa-check text-green-500' : 'fa-times text-red-500'} text-xl`}></i>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-16 lg:py-20 bg-slate-50 relative">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-navy-900 mb-6 tracking-tight">
                Everything You Need to <span className="relative inline-block">
                  <span className="relative z-10">Hire Smarter</span>
                  <span className="absolute bottom-2 left-0 w-full h-3 bg-sky-200/50 -rotate-1 rounded-full -z-0"></span>
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                A complete hiring ecosystem designed to eliminate friction, reduce ghosting, and accelerate your best decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="feature-card group bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden relative transition-all duration-300">
                <div className="feature-card__content p-8">
                  <div className="icon-badge w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-6">
                    <i className="fa-solid fa-search text-2xl text-sky-600"></i>
                  </div>

                  <h3 className="text-2xl font-bold text-navy-900 mb-3">Smart Sourcing</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">AI-powered candidate discovery that finds the perfect match across multiple channels automatically.</p>

                  <div className="mt-auto pt-4 border-t border-slate-200/50">
                    <ul className="space-y-3">
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-3 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></span>
                        Multi-channel sourcing
                      </li>
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-3 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></span>
                        AI candidate matching
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="feature-card group bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden relative transition-all duration-300">
                <div className="feature-card__content p-8">
                  <div className="icon-badge w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-6" style={{animationDelay: '1.5s'}}>
                    <i className="fa-solid fa-filter text-2xl text-navy-600"></i>
                  </div>

                  <h3 className="text-2xl font-bold text-navy-900 mb-3">Intelligent Screening</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">Automate resume parsing and skills assessment to filter out unqualified candidates instantly.</p>

                  <div className="mt-auto pt-4 border-t border-slate-200/50">
                    <ul className="space-y-3">
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy-500 mr-3 shadow-[0_0_8px_rgba(51,78,104,0.4)]"></span>
                        Automated resume parsing
                      </li>
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy-500 mr-3 shadow-[0_0_8px_rgba(51,78,104,0.4)]"></span>
                        Skills-based filtering
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="feature-card group bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden relative transition-all duration-300">
                <div className="feature-card__content p-8">
                  <div className="icon-badge w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-6" style={{animationDelay: '0.5s'}}>
                    <i className="fa-solid fa-users text-2xl text-sky-600"></i>
                  </div>

                  <h3 className="text-2xl font-bold text-navy-900 mb-3">Team Collaboration</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">Keep hiring managers and recruiters aligned with shared scorecards and centralized feedback.</p>

                  <div className="mt-auto pt-4 border-t border-slate-200/50">
                    <ul className="space-y-3">
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-3 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></span>
                        Shared scorecards
                      </li>
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-3 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></span>
                        Real-time feedback loops
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="feature-card group bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden relative transition-all duration-300">
                <div className="feature-card__content p-8">
                  <div className="icon-badge w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-6" style={{animationDelay: '2s'}}>
                    <i className="fa-solid fa-calendar-check text-2xl text-navy-600"></i>
                  </div>

                  <h3 className="text-2xl font-bold text-navy-900 mb-3">Interview Management</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">Streamline scheduling with smart calendar integration and automate candidate reminders.</p>

                  <div className="mt-auto pt-4 border-t border-slate-200/50">
                    <ul className="space-y-3">
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy-500 mr-3 shadow-[0_0_8px_rgba(51,78,104,0.4)]"></span>
                        One-click scheduling
                      </li>
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy-500 mr-3 shadow-[0_0_8px_rgba(51,78,104,0.4)]"></span>
                        Automated reminders
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 5 */}
              <div className="feature-card group bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden relative transition-all duration-300">
                <div className="feature-card__content p-8">
                  <div className="icon-badge w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-6" style={{animationDelay: '1s'}}>
                    <i className="fa-solid fa-chart-line text-2xl text-sky-600"></i>
                  </div>

                  <h3 className="text-2xl font-bold text-navy-900 mb-3">Analytics & Insights</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">Track every metric that matters. Understand time-to-hire, source effectiveness, and pipeline health.</p>

                  <div className="mt-auto pt-4 border-t border-slate-200/50">
                    <ul className="space-y-3">
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-3 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></span>
                        Real-time dashboards
                      </li>
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-3 shadow-[0_0_8px_rgba(14,165,233,0.6)]"></span>
                        Predictive analytics
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 6 */}
              <div className="feature-card group bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden relative transition-all duration-300">
                <div className="feature-card__content p-8">
                  <div className="icon-badge w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-6" style={{animationDelay: '2.5s'}}>
                    <i className="fa-solid fa-rocket text-2xl text-navy-600"></i>
                  </div>

                  <h3 className="text-2xl font-bold text-navy-900 mb-3">Seamless Onboarding</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">Turn accepted offers into day-one success with digital offer letters and automated paperwork.</p>

                  <div className="mt-auto pt-4 border-t border-slate-200/50">
                    <ul className="space-y-3">
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy-500 mr-3 shadow-[0_0_8px_rgba(51,78,104,0.4)]"></span>
                        Digital offer letters
                      </li>
                      <li className="flex items-center text-sm font-semibold text-navy-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy-500 mr-3 shadow-[0_0_8px_rgba(51,78,104,0.4)]"></span>
                        Document management
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 lg:py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 lg:mb-14">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">Answers to our most frequently asked questions are just one click away.</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-white rounded-2xl p-2 border-2 border-sky-100 mb-7 shadow-sm">
              {faqItems.map((item, index) => (
                <div key={index} className="faq-item group">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none rounded-xl hover:bg-white/60 transition-all duration-200"
                  >
                    <span className="text-base font-bold text-navy-900 pr-3">{item.question}</span>
                    <span className="ml-3 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white text-navy-600 shadow-sm group-hover:shadow-md transition-all duration-200">
                      <i className={`fa-solid ${openFaqIndex === index ? 'fa-minus' : 'fa-plus'} text-sm transition-transform duration-300 ${openFaqIndex === index ? 'rotate-0' : ''}`}></i>
                    </span>
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-4 pb-4 pt-1">
                      <div className="bg-white rounded-lg p-4 border border-sky-100 shadow-sm">
                        <p className="text-sm text-slate-600 leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  )}
                  {index < faqItems.length - 1 && <div className="h-px bg-sky-100 mx-4"></div>}
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-navy-50 to-white rounded-2xl p-6 lg:p-7 border-2 border-slate-200 flex flex-col gap-4 shadow-md relative">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-navy-900 mb-2">Still have questions?</h3>
                  <p className="text-slate-600 text-sm">Can't find the answer you're looking for? Please chat to our friendly team.</p>
                </div>
                <button 
                  onClick={() => {
                    setShowEmail(!showEmail);
                    setEmailCopied(false);
                  }}
                  className="bg-navy-800 text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-navy-700 hover:shadow-xl transition-all duration-300 whitespace-nowrap shadow-md hover:scale-105"
                >
                  Get in Touch
                </button>
              </div>
              {showEmail && (
                <div className="mt-4 p-4 bg-white border-2 border-navy-200 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 mb-1">Contact us at:</p>
                      <a 
                        href="mailto:officialhiremeapp@gmail.com" 
                        className="text-navy-800 hover:text-navy-600 font-semibold text-base break-all"
                      >
                        officialhiremeapp@gmail.com
                      </a>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText('officialhiremeapp@gmail.com');
                          setEmailCopied(true);
                          setTimeout(() => setEmailCopied(false), 2000);
                        } catch (err) {
                          console.error('Failed to copy email:', err);
                        }
                      }}
                      className="px-4 py-2 bg-sky-100 text-navy-800 rounded-lg font-medium text-sm hover:bg-sky-200 transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                    >
                      {emailCopied ? (
                        <>
                          <span className="text-green-600">✓ Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-20 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-72 h-72 bg-sky-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-600 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 lg:mb-7 tracking-tight leading-tight">Want to get hired?</h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-sky-100 mb-8 lg:mb-10 leading-relaxed max-w-2xl mx-auto">
              Join Applicants and Employers from around the world with HireMe
            </p>
            <div className="flex items-center justify-center">
              <Link href="/auth/signup" className="bg-white text-navy-900 px-9 py-3.5 rounded-lg font-bold text-lg hover:bg-sky-50 hover:shadow-xl transition-all duration-300 shadow-lg hover:scale-105">
                Hire ME!
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
