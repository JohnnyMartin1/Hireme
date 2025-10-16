"use client";
import Link from "next/link";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import AnimatedLogo from "./AnimatedLogo";

export default function SiteHeader() {
  const { user, profile, signOut } = useFirebaseAuth();

  return (
    <header className="bg-white/80 backdrop-blur-sm py-4 px-6 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <AnimatedLogo size="md" />
        </Link>

        {!user ? (
          <div className="flex items-center space-x-8">
            <span className="text-gray-700 font-medium hover:text-navy transition cursor-pointer">Home</span>
            <Link
              href="/auth/signup"
              className="bg-navy text-white px-6 py-2 rounded-full font-medium hover:bg-blue-900 transition btn-hover"
            >
              Sign up
            </Link>
            <Link
              href="/auth/login"
              className="text-gray-700 border border-gray-300 px-6 py-2 rounded-full font-medium hover:bg-gray-100 hover:text-navy transition btn-hover"
            >
              Log in
            </Link>
          </div>
        ) : (
          <nav className="flex items-center gap-6">
            <Link 
              href={
                profile?.role === 'JOB_SEEKER' 
                  ? '/home/seeker' 
                  : profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER'
                  ? '/home/employer'
                  : '/'
              } 
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Dashboard
            </Link>
            {profile?.role === 'JOB_SEEKER' && (
              <Link 
                href="/info" 
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Information
              </Link>
            )}
            {profile?.role === 'EMPLOYER' && (
              <Link 
                href="/info/employer" 
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Information
              </Link>
            )}
            <Link 
              href="/settings" 
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={signOut}
              className="hireme-btn hireme-btn-ghost text-sm"
            >
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
