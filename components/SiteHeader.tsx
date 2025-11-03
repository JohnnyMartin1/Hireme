"use client";
import Link from "next/link";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import HireMeLogo from "./brand/HireMeLogo";

export default function SiteHeader() {
  const { user, profile, signOut } = useFirebaseAuth();

  return (
    <header className="bg-white/80 backdrop-blur-sm py-4 px-4 sm:px-6 sticky top-0 z-50 shadow-sm mobile-safe-top">
      <div className="container mx-auto flex items-center justify-between max-w-full">
        <Link href="/" className="shrink-0" aria-label="HireMe home">
          <HireMeLogo variant="full" className="h-6 sm:h-8 w-auto" />
        </Link>

        {!user ? (
          <div className="flex items-center space-x-2 sm:space-x-8">
            <Link
              href="/"
              className="text-gray-700 font-medium hover:text-navy transition cursor-pointer text-sm sm:text-base hidden sm:block"
            >
              Home
            </Link>
            <Link
              href="/auth/signup"
              className="bg-navy text-white px-3 sm:px-6 py-2 rounded-full font-medium hover:bg-blue-900 transition btn-hover text-sm sm:text-base"
            >
              Sign up
            </Link>
            <Link
              href="/auth/login"
              className="text-gray-700 border border-gray-300 px-3 sm:px-6 py-2 rounded-full font-medium hover:bg-gray-100 hover:text-navy transition btn-hover text-sm sm:text-base"
            >
              Log in
            </Link>
          </div>
        ) : (
          <nav className="flex items-center gap-2 sm:gap-6 overflow-x-auto">
            <Link 
              href={
                profile?.role === 'JOB_SEEKER' 
                  ? '/home/seeker' 
                  : profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER'
                  ? '/home/employer'
                  : '/'
              } 
              className="text-xs sm:text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-2 sm:px-3 py-2 rounded-lg whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link 
              href={`/account/${user?.uid}/settings`}
              className="text-xs sm:text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-2 sm:px-3 py-2 rounded-lg whitespace-nowrap"
            >
              Settings
            </Link>
            <button
              onClick={signOut}
              className="hireme-btn hireme-btn-ghost text-xs sm:text-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md whitespace-nowrap"
            >
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
