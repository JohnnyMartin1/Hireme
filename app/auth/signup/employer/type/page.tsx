"use client";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EmployerTypePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-grow flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-navy-800 mb-3">Choose Your Profile Type</h1>
            <p className="text-lg text-gray-600">Are you setting up a company profile or joining as a recruiter?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex-grow">
                <div className="flex items-center justify-center w-16 h-16 soft-blue rounded-xl mb-6">
                  <i className="fa-solid fa-building text-navy-800 text-3xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-navy-800 mb-3">Company Profile</h2>
                <p className="text-gray-600 mb-6">Create a new company profile to represent your organization. You'll be able to post jobs and invite recruiters to help manage hiring.</p>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Full company profile management</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Post and manage job listings</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Invite and manage recruiters</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Access to candidate database</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <button
                  onClick={() => router.push('/auth/signup/employer/company')}
                  className="font-bold text-navy-800 hover:text-sky-400 transition-colors duration-200 group cursor-pointer"
                >
                  Set up company profile
                  <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex-grow">
                <div className="flex items-center justify-center w-16 h-16 soft-purple rounded-xl mb-6">
                  <i className="fa-solid fa-users text-purple-700 text-3xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-navy-800 mb-3">Recruiter Profile</h2>
                <p className="text-gray-600 mb-6">Join an existing company as a recruiter. You'll need an invitation from your company administrator to get started.</p>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Link to company profile</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Post jobs for your company</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Search and contact candidates</span>
                  </li>
                  <li className="flex items-start">
                    <i className="fa-solid fa-check text-navy-800 mt-1 mr-3"></i>
                    <span>Collaborate with other recruiters</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <button
                  onClick={() => router.push('/auth/signup/employer/recruiter')}
                  className="font-bold text-navy-800 hover:text-sky-400 transition-colors duration-200 group cursor-pointer"
                >
                  Join as recruiter
                  <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/auth/signup" className="text-gray-600 font-medium hover:text-navy-800 transition-colors duration-200 group cursor-pointer">
              <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i>
              Back to signup options
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

