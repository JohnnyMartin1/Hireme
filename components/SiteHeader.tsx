"use client";
import Link from "next/link";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import Logo from "./Logo";

export default function SiteHeader() {
  const { user, profile, signOut } = useFirebaseAuth();

  return (
    <header className="border-b border-[var(--border)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo size="md" className="hireme-logo" />
        </Link>

        {!user ? (
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              Home
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/signup"
                className="hireme-btn hireme-btn-primary text-sm"
              >
                Sign up
              </Link>
              <Link
                href="/auth/login"
                className="hireme-btn hireme-btn-ghost text-sm"
              >
                Log in
              </Link>
            </div>
          </nav>
        ) : (
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              Home
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
