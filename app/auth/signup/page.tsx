"use client";
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="pastel-bg min-h-screen">
      {/* Join HireMe Main Section */}
      <section className="min-h-screen flex items-center justify-center py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-navy leading-tight mb-6">
              Join HireMe
            </h1>
            <p className="text-xl text-gray-600 max-w-xl mx-auto">
              Choose how you want to use HireMe
            </p>
          </div>
          
          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            
            {/* Job Seeker Card */}
            <div className="bg-white rounded-3xl p-12 text-center card-glow card-hover transition-all duration-300 border border-light-gray">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-light-blue to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 icon-scale transition-transform duration-300">
                  <i className="fa-solid fa-user text-navy text-3xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-navy mb-4">I'm a Job Seeker</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-8">
                  Create your professional profile and get discovered by top employers.
                </p>
              </div>
              
              <div className="space-y-4 mb-10 text-left">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-xl"></i>
                  <span className="text-gray-700 font-medium">Build a rich professional profile</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-xl"></i>
                  <span className="text-gray-700 font-medium">Upload resume and intro video</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-xl"></i>
                  <span className="text-gray-700 font-medium">Receive messages from employers</span>
                </div>
              </div>
              
              <Link
                href="/auth/signup/seeker"
                className="w-full bg-navy text-white px-8 py-4 rounded-full font-semibold text-lg transition btn-hover btn-navy shadow-lg border border-light-gray block text-center"
              >
                Sign up as Job Seeker
              </Link>
            </div>
            
            {/* Employer Card */}
            <div className="bg-white rounded-3xl p-12 text-center card-glow card-hover transition-all duration-300 border border-light-gray">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-light-blue to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 icon-scale transition-transform duration-300">
                  <i className="fa-solid fa-building text-navy text-3xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-navy mb-4">I'm an Employer</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-8">
                  Find and connect with talented early-career professionals.
                </p>
              </div>
              
              <div className="space-y-4 mb-10 text-left">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-xl"></i>
                  <span className="text-gray-700 font-medium">Search and discover candidates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-xl"></i>
                  <span className="text-gray-700 font-medium">Send direct messages</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-check-circle check-icon text-xl"></i>
                  <span className="text-gray-700 font-medium">Build your company profile</span>
                </div>
              </div>
              
              <Link
                href="/auth/signup/employer"
                className="w-full bg-light-blue text-navy px-8 py-4 rounded-full font-semibold text-lg transition btn-hover btn-light-blue shadow-lg border border-light-gray block text-center"
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