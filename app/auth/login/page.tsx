"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signInWithFirebase } from "@/lib/firebase-auth";
import { getDocument } from "@/lib/firebase-firestore";
import type { UserProfile } from "@/types/user";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);

    try {
      const { user, error } = await signInWithFirebase(email, password);

      if (error) {
        setErr(error);
      } else if (user) {
        // Fetch user profile to determine role
        try {
          const { data: profile, error: profileError } = await getDocument('users', user.uid);
          
          if (profileError) {
            setErr("Error fetching user profile. Please try again.");
            return;
          }

          if (profile) {
            // Cast to our shared type
            const p = profile as Partial<UserProfile>;
            const userRole = p.role ?? null;

            // Check for admin email first
            if (user?.email === 'officialhiremeapp@gmail.com') {
              router.push("/admin");
            } else if (userRole === "EMPLOYER" || userRole === "RECRUITER") {
              router.push("/home/employer");
            } else if (userRole === "JOB_SEEKER") {
              router.push("/home/seeker");
            } else if (userRole === "ADMIN") {
              router.push("/admin");
            } else {
              setErr("Invalid user role. Please contact support.");
            }
          } else {
            setErr("User profile not found. Please contact support.");
          }
        } catch (profileError) {
          setErr("Error fetching user profile. Please try again.");
        }
      }
    } catch (error: any) {
      setErr("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 mobile-safe-top mobile-safe-bottom" style={{background: 'linear-gradient(170deg, #F3F7FF 0%, #E6F2FF 40%, #F8FAFC 100%)'}}>
      <div className="w-full max-w-md">
        {/* App Mark & Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
              <svg width="269" height="274" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="HireMe magnifying glass logo">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="#0B1F4B"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
                <path d="M166.528 188.213C166.528 211.685 141.68 230.713 111.028 230.713C80.3763 230.713 55.5282 211.685 55.5282 188.213C55.5282 164.741 80.3763 145.713 111.028 145.713C141.68 145.713 166.528 164.741 166.528 188.213Z" fill="#0B1F4B"/>
                <path d="M147.022 97.5C147.022 119.315 130.233 137 109.522 137C88.8116 137 72.0222 119.315 72.0222 97.5C72.0222 75.6848 88.8116 60.5 109.522 60.5C130.233 60.5 147.022 75.6848 147.022 97.5Z" fill="#0B1F4B"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">Welcome back!</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="font-semibold text-brand-blue hover:underline transition-all">
              Sign up
            </Link>
          </p>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/60">
          {/* Error Banner */}
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert" aria-live="polite">
              <p className="text-sm">{err}</p>
            </div>
          )}

          {/* Credential Form */}
          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
            <div className="relative">
              <input
                name="email"
                type="email"
                className="w-full bg-form-bg border border-gray-200 rounded-xl py-3 sm:py-4 px-4 text-navy placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue focus:bg-white transition-all duration-300 text-base"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <input
                name="password"
                type="password"
                className="w-full bg-form-bg border border-gray-200 rounded-xl py-3 sm:py-4 px-4 pr-12 text-navy placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue focus:bg-white transition-all duration-300 text-base"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-navy text-white font-semibold py-3 sm:py-4 px-4 rounded-xl hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 min-h-[44px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Logging in...
                </div>
              ) : (
                'Log In'
              )}
            </button>

            <div className="text-center">
              <Link href="#" className="text-sm text-brand-blue hover:underline hover:scale-105 transition-all duration-200 inline-block">
                Forgot Password?
              </Link>
            </div>
          </form>

          {/* Footer Legal */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs text-gray-500 leading-relaxed break-words">
              By continuing, you agree to our{" "}
              <Link href="#" className="text-brand-blue hover:underline">Terms of Service</Link> and{" "}
              <Link href="#" className="text-brand-blue hover:underline">Privacy Policy</Link>.{" "}
              <Link href="#" className="text-brand-blue hover:underline">Need help?</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
