"use client";
import Link from "next/link";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import HireMeLogo from "./brand/HireMeLogo";

export default function SiteHeader() {
  const { user, profile, signOut } = useFirebaseAuth();

  return (
    <header className="bg-white/80 backdrop-blur-sm py-4 px-6 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="shrink-0" aria-label="HireMe home">
          <HireMeLogo variant="full" className="h-8 w-auto" />
        </Link>

        {!user ? (
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 font-medium hover:text-navy transition cursor-pointer"
            >
              Home
            </Link>
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
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-3 py-2 rounded-lg"
            >
              Dashboard
            </Link>
            {profile?.role === 'JOB_SEEKER' && (
              <Link 
                href="/info" 
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-3 py-2 rounded-lg"
              >
                Information
              </Link>
            )}
            {profile?.role === 'EMPLOYER' && (
              <Link 
                href="/info/employer" 
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-3 py-2 rounded-lg"
              >
                Information
              </Link>
            )}
            <Link 
              href="/settings" 
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-3 py-2 rounded-lg"
            >
              Settings
            </Link>
            <button
              onClick={signOut}
              className="hireme-btn hireme-btn-ghost text-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
