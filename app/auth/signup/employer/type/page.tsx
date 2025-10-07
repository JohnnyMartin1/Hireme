"use client";
import { useRouter } from 'next/navigation';
import { Building, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function EmployerTypePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Profile Type</h1>
          <p className="text-xl text-gray-600">Are you setting up a company profile or joining as a recruiter?</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Company Profile Option */}
          <button
            onClick={() => router.push('/auth/signup/employer/company')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 text-left group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-6 group-hover:bg-blue-600 transition-colors">
              <Building className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Profile</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Create a new company profile to represent your organization. You'll be able to post jobs and invite recruiters to help manage hiring.
            </p>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Full company profile management</span>
              </li>
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Post and manage job listings</span>
              </li>
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Invite and manage recruiters</span>
              </li>
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Access to candidate database</span>
              </li>
            </ul>
            
            <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
              <span>Set up company profile</span>
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Recruiter Profile Option */}
          <button
            onClick={() => router.push('/auth/signup/employer/recruiter')}
            className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105 text-left group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-xl mb-6 group-hover:bg-purple-600 transition-colors">
              <Users className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recruiter Profile</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Join an existing company as a recruiter. You'll need an invitation from your company administrator to get started.
            </p>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Link to company profile</span>
              </li>
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Post jobs for your company</span>
              </li>
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Search and contact candidates</span>
              </li>
              <li className="flex items-start text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>Collaborate with other recruiters</span>
              </li>
            </ul>
            
            <div className="flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
              <span>Join as recruiter</span>
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link href="/auth/signup" className="text-gray-600 hover:text-gray-900 transition-colors">
            ← Back to signup options
          </Link>
        </div>
      </div>
    </main>
  );
}

