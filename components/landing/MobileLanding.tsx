"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { Briefcase, Users, Search, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { isCapacitor, getPlatform } from "@/lib/capacitor";

export default function MobileLanding() {
  // Debug: Log platform detection (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('MobileLanding rendered');
      console.log('isCapacitor:', isCapacitor());
      console.log('Platform:', getPlatform());
      console.log('Current URL:', window.location.href);
    }
  }, []);
  const { user, profile } = useFirebaseAuth();

  // Determine dashboard link based on user role
  const dashboardLink = profile?.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER'
    ? '/home/employer'
    : '/';

  const features = [
    {
      icon: Search,
      title: "Smart Matching",
      description: "AI-powered candidate matching for perfect fits"
    },
    {
      icon: Briefcase,
      title: "Job Discovery",
      description: "Find opportunities tailored to your skills"
    },
    {
      icon: Users,
      title: "Direct Connection",
      description: "Connect directly with employers and candidates"
    },
    {
      icon: CheckCircle,
      title: "Verified Profiles",
      description: "Trusted platform with verified professionals"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-500 via-blue-600 to-navy-800 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-sky-300 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 pt-16 pb-12">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-3 tracking-tight">
              HireMe
            </h1>
            <p className="text-xl text-white/90 font-medium">
              Your Career Journey Starts Here
            </p>
          </div>

          {/* Main CTA */}
          {!user ? (
            <div className="space-y-3 mb-12">
              <Link 
                href="/auth/signup"
                className="block w-full bg-white text-blue-600 py-4 rounded-xl text-center font-bold text-lg shadow-xl hover:bg-sky-50 transition-all duration-200 active:scale-95"
              >
                Get Started Free
              </Link>
              <Link 
                href="/auth/login"
                className="block w-full bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 py-4 rounded-xl text-center font-semibold text-lg hover:bg-white/20 transition-all duration-200 active:scale-95"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <div className="mb-12">
              <Link 
                href={dashboardLink}
                className="block w-full bg-white text-blue-600 py-4 rounded-xl text-center font-bold text-lg shadow-xl hover:bg-sky-50 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Value Proposition */}
          <div className="text-center mb-8">
            <p className="text-lg text-white/80 leading-relaxed">
              Connect with top employers and discover your next opportunity
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose HireMe?</h2>
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              >
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold mb-1">10K+</div>
              <div className="text-xs text-white/80">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">5K+</div>
              <div className="text-xs text-white/80">Jobs Posted</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">8K+</div>
              <div className="text-xs text-white/80">Matches Made</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      {!user && (
        <div className="container mx-auto px-4 pb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
            <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
            <p className="text-white/80 mb-4 text-sm">
              Join thousands of professionals finding their dream jobs
            </p>
            <Link 
              href="/auth/signup"
              className="inline-block w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-sky-50 transition-all duration-200 active:scale-95"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="container mx-auto px-4 pb-8 text-center">
        <p className="text-sm text-white/60">
          © 2024 HireMe. All rights reserved.
        </p>
      </div>
    </div>
  );
}
