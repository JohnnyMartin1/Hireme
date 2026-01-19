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

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 border-b border-slate-100 mobile-safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="shrink-0" aria-label="HireMe home">
          <HireMeLogo variant="full" className="h-7 sm:h-8 w-auto" />
        </Link>

        {!user ? (
          <>
            {/* Desktop Navigation - Not Logged In */}
            <div className="hidden sm:flex items-center space-x-4 md:space-x-6">
              <Link
                href="/"
                className="text-sm text-slate-600 hover:text-navy-700 font-medium transition-colors duration-200"
              >
                Home
              </Link>
              <Link
                href="/auth/signup"
                className="bg-navy-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-navy-700 hover:shadow-lg transition-all duration-300"
              >
                Sign up
              </Link>
              <Link
                href="/auth/login"
                className="text-slate-700 hover:text-navy-700 font-medium transition-colors duration-200 text-sm"
              >
                Log In
              </Link>
            </div>

            {/* Mobile Navigation - Not Logged In */}
            <div className="flex sm:hidden items-center space-x-2">
              <Link
                href="/auth/signup"
                className="bg-navy-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-navy-700 transition-all text-sm"
              >
                Sign up
              </Link>
              <Link
                href="/auth/login"
                className="text-slate-700 px-3 py-2 font-medium hover:text-navy-700 transition-colors text-sm"
              >
                Log in
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Desktop Navigation - Logged In */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-4">
              <Link 
                href={`/account/${user?.uid}/settings`}
                className="text-sm text-navy-900 hover:text-navy-700 font-semibold px-4 py-2 rounded-lg hover:bg-sky-50 transition-all duration-200"
              >
                Settings
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-navy-900 hover:text-navy-700 font-semibold px-4 py-2 rounded-lg hover:bg-sky-50 transition-all duration-200"
              >
                Sign out
              </button>
            </nav>

            {/* Mobile Hamburger Button - Logged In */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMobileMenuOpen(true);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              className="md:hidden p-2.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-50 relative touch-manipulation"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              type="button"
            >
              <Menu className="h-6 w-6 text-slate-700 pointer-events-none" />
            </button>

            {/* Mobile Menu - Logged In */}
            <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
              <nav className="flex flex-col w-full">
                <Link 
                  href={`/account/${user?.uid}/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-4 text-base font-medium text-navy-900 hover:bg-sky-50 active:bg-sky-100 transition-colors border-b border-slate-100 min-h-[56px] w-full text-center"
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center justify-center px-4 py-4 text-base font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors w-full min-h-[56px] text-center"
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
