"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { Mail, CheckCircle, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Handle token verification from email link
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && user) {
      handleTokenVerification(token);
    }
  }, [searchParams, user]);

  useEffect(() => {
    // If not logged in, redirect to login
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Check if email is verified in Firestore
    if (profile?.emailVerified) {
      const role = profile?.role;
      if (role === 'EMPLOYER' || role === 'RECRUITER') {
        router.push("/home/employer");
      } else if (role === 'JOB_SEEKER') {
        router.push("/home/seeker");
      } else {
        router.push("/home");
      }
    }
  }, [user, profile, loading, router]);

  const handleTokenVerification = async (token: string) => {
    setIsVerifying(true);
    setResendMessage("");

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResendMessage("✓ Email verified successfully! Redirecting...");
        
        // Refresh the user profile to get updated emailVerified status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setResendMessage(data.error || "Failed to verify email. The link may have expired.");
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      setResendMessage("Error verifying email. Please try again or request a new link.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user || !profile) return;

    setIsResending(true);
    setResendMessage("");

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          userName: profile.firstName ? `${profile.firstName} ${profile.lastName}` : user.email?.split('@')[0]
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResendMessage("✓ Verification email sent! Check your inbox.");
      } else {
        setResendMessage(data.error || "Failed to send email. Please try again.");
      }
    } catch (error) {
      console.error('Error resending email:', error);
      setResendMessage("Error sending email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setResendMessage("");
    
    try {
      // Reload the page to refresh profile data
      window.location.reload();
    } catch (error) {
      console.error('Error checking verification:', error);
      setResendMessage("Error checking verification status. Please try again.");
      setIsChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.emailVerified) {
    return null; // Will redirect via useEffect
  }

  // Show verifying state if token is being processed
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Icon */}
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-3">
            Verify Your Email
          </h1>

          {/* User Email */}
          <p className="text-center text-gray-600 mb-6">
            We sent a verification email to:
            <br />
            <span className="font-semibold text-gray-900">{user.email}</span>
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Check your email inbox</li>
                  <li>Click the verification link in the email</li>
                  <li>Return here and click "I've Verified My Email"</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Check Verification Button */}
          <button
            onClick={handleCheckVerification}
            disabled={isChecking}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium mb-3 flex items-center justify-center"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                I've Verified My Email
              </>
            )}
          </button>

          {/* Resend Button */}
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
          >
            {isResending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                Resend Verification Email
              </>
            )}
          </button>

          {/* Message */}
          {resendMessage && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              resendMessage.startsWith('✓') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {resendMessage}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Didn't receive the email?</p>
            <ul className="mt-2 space-y-1">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure {user.email} is correct</li>
              <li>• Try resending the verification email</li>
            </ul>
          </div>

          {/* Sign Out Link */}
          <div className="mt-6 text-center">
            <Link 
              href="/auth/login" 
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Sign out and use a different email
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

