"use client";
import { useState } from "react";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { AlertCircle, X, Mail, Loader2 } from "lucide-react";

export default function EmailVerificationBanner() {
  const { user, profile, loading } = useFirebaseAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");

  // Don't show banner while loading profile data, or if email is verified or user not logged in
  if (loading || !user || !profile || profile?.emailVerified || !isVisible) {
    return null;
  }

  const handleResend = async () => {
    if (!user || !profile) return;

    setIsResending(true);
    setMessage("");

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
        setMessage("✓ Verification email sent! Check your inbox.");
      } else {
        setMessage(data.error || "Failed to send email.");
      }
    } catch (error) {
      setMessage("Error sending email. Please try again.");
    } finally {
      setIsResending(false);
      // Clear message after 5 seconds
      setTimeout(() => setMessage(""), 5000);
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center flex-1 min-w-0">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                Please verify your email address to access all features
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Check your inbox at <span className="font-semibold">{user.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center px-3 py-1.5 border border-yellow-600 text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-1.5" />
                  Resend Email
                </>
              )}
            </button>

            <button
              onClick={() => setIsVisible(false)}
              className="text-yellow-600 hover:text-yellow-800 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {message && (
          <div className="pb-3">
            <p className={`text-xs ${
              message.startsWith('✓') 
                ? 'text-green-700' 
                : 'text-red-700'
            }`}>
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

