"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { Clock, Mail, CheckCircle, Building2 } from "lucide-react";
import Link from "next/link";

export default function VerificationPendingPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // If email is already verified and company is approved, redirect to dashboard
    if (profile?.emailVerified && profile?.status === 'verified') {
      router.push("/home/employer");
      return;
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registration Under Review
          </h1>
          <p className="text-gray-600">
            Your company registration has been submitted successfully!
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {/* Email Verification Step */}
          <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Step 1: Verify Your Email</h3>
              <p className="text-blue-800 text-sm">
                Check your inbox for a verification email and click the link to verify your email address.
              </p>
              {!profile?.emailVerified && (
                <Link 
                  href="/auth/verify-email"
                  className="text-blue-600 hover:underline text-sm font-medium mt-2 inline-block"
                >
                  Resend verification email →
                </Link>
              )}
              {profile?.emailVerified && (
                <div className="flex items-center text-green-600 text-sm font-medium mt-2">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Email verified
                </div>
              )}
            </div>
          </div>

          {/* Company Verification Step */}
          <div className="flex items-start space-x-4 p-4 bg-orange-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">Step 2: Company Verification</h3>
              <p className="text-orange-800 text-sm">
                Our admin team is reviewing your company registration to ensure platform quality. 
                You'll receive an email notification once your company is approved.
              </p>
              <div className="mt-2 text-sm text-orange-700">
                <strong>Current Status:</strong> {
                  profile?.status === 'pending_verification' 
                    ? 'Pending Review' 
                    : profile?.status === 'verified'
                    ? 'Approved'
                    : 'Under Review'
                }
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Our admin team will review your company information (usually within 24-48 hours)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>You'll receive an email notification once your company is approved</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>After approval, you'll have full access to all employer features</span>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-sm mb-4">
            Questions about your registration?
          </p>
          <Link 
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
