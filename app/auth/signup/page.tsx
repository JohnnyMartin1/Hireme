"use client";
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="min-h-screen mobile-safe-top mobile-safe-bottom" style={{ background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)' }}>
      {/* Join HireMe Main Section */}
      <section className="min-h-screen flex items-center justify-center py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 md:mb-14">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-navy-900 leading-tight mb-4 tracking-tight">
              Join HireMe
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
              Choose how you want to use HireMe
            </p>
          </div>
          
          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10 mb-8 sm:mb-12">
            
            {/* Job Seeker Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 text-center shadow-sm border-2 border-slate-100 card-hover">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fa-solid fa-user text-navy-800 text-2xl"></i>
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-navy-900 mb-3">I'm a Job Seeker</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Create your professional profile and get discovered by top employers.
                </p>
              </div>
              
              <ul className="space-y-2 mb-6 text-left">
                <li className="flex items-center text-sm text-slate-700">
                  <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                  <span>Build a rich professional profile</span>
                </li>
                <li className="flex items-center text-sm text-slate-700">
                  <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                  <span>Upload resume and intro video</span>
                </li>
                <li className="flex items-center text-sm text-slate-700">
                  <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                  <span>Receive messages from employers</span>
                </li>
              </ul>
              
              <Link
                href="/auth/signup/seeker"
                className="w-full bg-navy-800 text-white px-5 py-3 rounded-lg font-semibold text-base hover:bg-navy-700 hover:shadow-lg transition-all duration-300 block text-center shadow-md"
              >
                Sign up as Job Seeker
              </Link>
            </div>
            
            {/* Employer Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 text-center shadow-sm border-2 border-slate-100 card-hover">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <i className="fa-solid fa-building text-navy-800 text-2xl"></i>
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-navy-900 mb-3">I'm an Employer</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Find and connect with talented early-career professionals.
                </p>
              </div>
              
              <ul className="space-y-2 mb-6 text-left">
                <li className="flex items-center text-sm text-slate-700">
                  <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                  <span>Search and discover candidates</span>
                </li>
                <li className="flex items-center text-sm text-slate-700">
                  <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                  <span>Send direct messages</span>
                </li>
                <li className="flex items-center text-sm text-slate-700">
                  <i className="fa-solid fa-check text-navy-600 mr-2"></i>
                  <span>Build your company profile</span>
                </li>
              </ul>
              
              <Link
                href="/auth/signup/employer"
                className="w-full bg-navy-50 text-navy-800 px-5 py-3 rounded-lg font-semibold text-base hover:bg-navy-100 transition-all duration-200 block text-center"
              >
                Sign up as Employer
              </Link>
            </div>
            
          </div>
          
          {/* Login Link */}
          <div className="text-center">
            <p className="text-slate-600 text-base">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-navy-800 font-semibold hover:text-sky-600 transition-colors">
                Log in
              </Link>
            </p>
          </div>
          
        </div>
      </section>
    </div>
  );
}