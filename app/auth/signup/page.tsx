"use client";
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Join HireMe</h1>
        <p className="text-gray-600 text-lg">
          Choose how you want to use HireMe
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Job Seeker Card */}
        <div className="bg-white rounded-2xl shadow-card border p-8 hover:shadow-lg transition-shadow">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">I'm a Job Seeker</h2>
            <p className="text-gray-600">
              Create your professional profile and get discovered by top employers
            </p>
          </div>
          
          <ul className="space-y-3 mb-8 text-left">
            <li className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Build a rich professional profile
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Upload resume and intro video
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Receive messages from employers
            </li>
          </ul>

          <Link
            href="/auth/signup/seeker"
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors block text-center"
          >
            Sign up as Job Seeker
          </Link>
        </div>

        {/* Employer Card */}
        <div className="bg-white rounded-2xl shadow-card border p-8 hover:shadow-lg transition-shadow">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">I'm an Employer</h2>
            <p className="text-gray-600">
              Find and connect with talented early-career professionals
            </p>
          </div>
          
          <ul className="space-y-3 mb-8 text-left">
            <li className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Search and discover candidates
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Send direct messages
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Build your company profile
            </li>
          </ul>

          <Link
            href="/auth/signup/employer"
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors block text-center"
          >
            Sign up as Employer
          </Link>
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}