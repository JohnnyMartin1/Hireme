"use client";
import Link from "next/link";
import HireMeLogo from "@/components/brand/HireMeLogo";
import InteractiveWheel from "@/components/InteractiveWheel";
import ErrorBoundary from "@/components/ErrorBoundary";

function HomeContent() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative skyline-bg py-20 px-6 h-[700px] flex items-center">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="mb-8">
            <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <svg width="269" height="274" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="HireMe magnifying glass logo">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="#0B1F4B"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
                <path d="M166.528 188.213C166.528 211.685 141.68 230.713 111.028 230.713C80.3763 230.713 55.5282 211.685 55.5282 188.213C55.5282 164.741 80.3763 145.713 111.028 145.713C141.68 145.713 166.528 164.741 166.528 188.213Z" fill="#0B1F4B"/>
                <path d="M147.022 97.5C147.022 119.315 130.233 137 109.522 137C88.8116 137 72.0222 119.315 72.0222 97.5C72.0222 75.6848 88.8116 60.5 109.522 60.5C130.233 60.5 147.022 75.6848 147.022 97.5Z" fill="#0B1F4B"/>
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-navy leading-tight mb-6">
            Welcome to HireMe
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect employers with early-career talent. Find your next opportunity or discover the perfect candidate.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/auth/signup"
              className="bg-navy text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-900 transition btn-hover shadow-lg"
            >
              Get Started
            </Link>
            <Link 
              href="/auth/login"
              className="bg-white/80 backdrop-blur-sm text-navy border border-gray-300 px-8 py-4 rounded-full font-semibold text-lg hover:bg-light-blue/50 hover:border-light-blue transition btn-hover shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* For Job Seekers Card */}
            <div className="bg-white rounded-2xl p-8 text-center card-glow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-light-blue to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-bullseye text-navy text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">For Job Seekers</h3>
              <p className="text-gray-600 leading-relaxed">
                Create a comprehensive profile and let employers find you. Showcase your skills and let opportunities come to you.
              </p>
            </div>
            
            {/* For Employers Card */}
            <div className="bg-white rounded-2xl p-8 text-center card-glow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-light-blue to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-building text-navy text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">For Employers</h3>
              <p className="text-gray-600 leading-relaxed">
                Find talented candidates that match your company's needs. Access a curated pool of verified professionals.
              </p>
            </div>
            
            {/* Smart Matching Card */}
            <div className="bg-white rounded-2xl p-8 text-center card-glow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-light-blue to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-rocket text-navy text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">Smart Matching</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered candidate–employer matching for better connections. Experience the future of recruitment.
              </p>
            </div>
            
          </div>
        </div>
      </section>

      {/* Interactive Wheel Section */}
      <section className="py-20 px-6 bg-white overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-bold text-navy leading-tight mb-6">
                Simplifying Hiring Processes
              </h2>
              <p className="text-lg text-gray-600 mb-10 max-w-md mx-auto md:mx-0">
                Providing efficiency, transparency and standardization.
              </p>
              <Link 
                href="/info"
                className="bg-navy text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-900 transition btn-hover shadow-lg inline-flex items-center gap-2"
              >
                Learn More
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
            <div className="min-h-[480px] flex items-center justify-center">
              <ErrorBoundary>
                <InteractiveWheel />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <HireMeLogo variant="full" className="h-6 w-auto" />
              </div>
              <p className="text-gray-400">
                Connecting talent with opportunity through intelligent matching.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition cursor-pointer">Create Profile</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Browse Jobs</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Career Resources</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition cursor-pointer">Post Jobs</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Search Candidates</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Pricing</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition cursor-pointer">Help Center</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Contact Us</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Privacy Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2024 HireMe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
