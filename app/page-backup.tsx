"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import HireMeLogo from "@/components/brand/HireMeLogo";

function LoadingSpinner() {
  return (
    <div className="min-h-screen hireme-gradient-light flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--hireme-blue)] mx-auto mb-4"></div>
        <p className="text-[var(--muted)]">Loading...</p>
      </div>
    </div>
  );
}

function HomeContent() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  
  // If user is authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (user && profile && !loading) {
      if (profile.role === 'EMPLOYER') {
        router.push('/home/employer');
      } else {
        router.push('/home/seeker');
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // If user is authenticated, show loading while redirecting
  if (user && profile) {
    return <LoadingSpinner />;
  }

  return (
    <main className="min-h-screen hireme-gradient-light flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="mb-12">
          <div className="flex justify-center mb-8">
            <HireMeLogo variant="full" className="h-12 w-auto" />
          </div>
          <h1 className="text-5xl font-bold text-[var(--hireme-navy)] mb-6">
            Welcome to HireMe
          </h1>
          <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto">
            Connect employers with early-career talent. Find your next opportunity or discover the perfect candidate.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/auth/signup" 
            className="hireme-btn hireme-btn-primary text-lg px-8 py-4 shadow-lg hover:shadow-xl"
          >
            Get Started
          </Link>
          <Link 
            href="/auth/login" 
            className="hireme-btn hireme-btn-secondary text-lg px-8 py-4"
          >
            Sign In
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="hireme-card text-center">
            <div className="w-16 h-16 bg-[var(--hireme-light-blue)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[var(--hireme-navy)]">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">For Job Seekers</h3>
            <p className="text-[var(--muted)]">Create a comprehensive profile and let employers find you</p>
          </div>
          
          <div className="hireme-card text-center">
            <div className="w-16 h-16 bg-[var(--hireme-light-blue)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[var(--hireme-navy)]">🏢</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">For Employers</h3>
            <p className="text-[var(--muted)]">Find talented candidates that match your company's needs</p>
          </div>
          
          <div className="hireme-card text-center">
            <div className="w-16 h-16 bg-[var(--hireme-light-blue)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[var(--hireme-navy)]">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Smart Matching</h3>
            <p className="text-[var(--muted)]">AI-powered candidate-employer matching for better connections</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return <HomeContent />;
}
