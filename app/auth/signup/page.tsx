"use client";
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="pastel-bg min-h-screen mobile-safe-top mobile-safe-bottom">
      {/* Join HireMe Main Section */}
      <section className="min-h-screen flex items-center justify-center py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-navy leading-tight mb-4 sm:mb-6">
              Join HireMe
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-xl mx-auto px-4">
              Choose how you want to use HireMe
            </p>
          </div>
          
          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 mb-8 sm:mb-12">
            
            {/* Job Seeker Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center card-glow card-hover transition-all duration-300 border border-light-gray">
              <div className="mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-light-blue to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 icon-scale transition-transform duration-300">
                  <i className="fa-solid fa-user text-navy text-2xl sm:text-3xl"></i>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-navy mb-3 sm:mb-4">I'm a Job Seeker</h2>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">
                  Create your professional profile and get discovered by top employers.
                </p>
              </div>
              
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 md:mb-10 text-left">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-lg sm:text-xl flex-shrink-0"></i>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Build a rich professional profile</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-lg sm:text-xl flex-shrink-0"></i>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Upload resume and intro video</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-lg sm:text-xl flex-shrink-0"></i>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Receive messages from employers</span>
                </div>
              </div>
              
              <Link
                href="/auth/signup/seeker"
                className="w-full bg-navy text-white px-6 sm:px-8 py-4 rounded-full font-semibold text-base sm:text-lg transition btn-hover btn-navy shadow-lg border border-light-gray block text-center min-h-[48px] flex items-center justify-center"
              >
                Sign up as Job Seeker
              </Link>
            </div>
            
            {/* Employer Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center card-glow card-hover transition-all duration-300 border border-light-gray">
              <div className="mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-light-blue to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 icon-scale transition-transform duration-300">
                  <i className="fa-solid fa-building text-navy text-2xl sm:text-3xl"></i>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-navy mb-3 sm:mb-4">I'm an Employer</h2>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">
                  Find and connect with talented early-career professionals.
                </p>
              </div>
              
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 md:mb-10 text-left">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-lg sm:text-xl flex-shrink-0"></i>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Search and discover candidates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-lg sm:text-xl flex-shrink-0"></i>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Send direct messages</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-lg sm:text-xl flex-shrink-0"></i>
                  <span className="text-gray-700 font-medium text-sm sm:text-base">Build your company profile</span>
                </div>
              </div>
              
              <Link
                href="/auth/signup/employer"
                className="w-full bg-light-blue text-navy px-6 sm:px-8 py-4 rounded-full font-semibold text-base sm:text-lg transition btn-hover btn-light-blue shadow-lg border border-light-gray block text-center min-h-[48px] flex items-center justify-center"
              >
                Sign up as Employer
              </Link>
            </div>
            
          </div>
          
          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600 text-lg">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-navy font-semibold hover:text-light-blue transition underline">
                Log in
              </Link>
            </p>
          </div>
          
        </div>
      </section>
    </div>
  );
}