"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import HireMeLogo from "./brand/HireMeLogo";
import MobileNav from "./mobile/MobileNav";

export default function SiteHeader() {
  const { user, profile, signOut } = useFirebaseAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardLink = profile?.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER'
    ? '/home/employer'
    : '/';

  return (
    <header className="bg-white/80 backdrop-blur-sm py-4 px-4 sm:px-6 sticky top-0 z-50 shadow-sm mobile-safe-top">
      <div className="container mx-auto flex items-center justify-between max-w-full">
        <Link href="/" className="shrink-0" aria-label="HireMe home">
          <HireMeLogo variant="full" className="h-6 sm:h-8 w-auto" />
        </Link>

        {!user ? (
          <>
            {/* Desktop Navigation - Not Logged In */}
            <div className="hidden sm:flex items-center space-x-4 md:space-x-8">
              <Link
                href="/"
                className="text-gray-700 font-medium hover:text-navy transition cursor-pointer text-sm md:text-base"
              >
                Home
              </Link>
              <Link
                href="/auth/signup"
                className="bg-navy text-white px-4 md:px-6 py-2 rounded-full font-medium hover:bg-blue-900 transition btn-hover text-sm md:text-base"
              >
                Sign up
              </Link>
              <Link
                href="/auth/login"
                className="text-gray-700 border border-gray-300 px-4 md:px-6 py-2 rounded-full font-medium hover:bg-gray-100 hover:text-navy transition btn-hover text-sm md:text-base"
              >
                Log in
              </Link>
            </div>

            {/* Mobile Navigation - Not Logged In */}
            <div className="flex sm:hidden items-center space-x-2">
              <Link
                href="/auth/signup"
                className="bg-navy text-white px-4 py-2 rounded-full font-medium hover:bg-blue-900 transition text-sm"
              >
                Sign up
              </Link>
              <Link
                href="/auth/login"
                className="text-gray-700 border border-gray-300 px-4 py-2 rounded-full font-medium hover:bg-gray-100 hover:text-navy transition text-sm"
              >
                Log in
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Desktop Navigation - Logged In */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href={dashboardLink} 
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-3 py-2 rounded-lg whitespace-nowrap"
              >
                Dashboard
              </Link>
              <Link 
                href={`/account/${user?.uid}/settings`}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200 hover:-translate-y-1 hover:shadow-md px-3 py-2 rounded-lg whitespace-nowrap"
              >
                Settings
              </Link>
              <button
                onClick={signOut}
                className="hireme-btn hireme-btn-ghost text-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md whitespace-nowrap"
              >
                Sign out
              </button>
            </nav>

            {/* Mobile Hamburger Button - Logged In */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </button>

            {/* Mobile Menu - Logged In */}
            <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
              <nav className="flex flex-col space-y-2">
                <Link 
                  href={dashboardLink}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href={`/account/${user?.uid}/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left w-full"
                >
                  Sign out
                </button>
              </nav>
            </MobileNav>
          </>
        )}
      </div>
    </header>
  );
}
