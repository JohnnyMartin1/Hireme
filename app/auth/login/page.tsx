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
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <svg width="269" height="274" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="HireMe magnifying glass logo">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="#0B1F4B"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
                <path d="M166.528 188.213C166.528 211.685 141.68 230.713 111.028 230.713C80.3763 230.713 55.5282 211.685 55.5282 188.213C55.5282 164.741 80.3763 145.713 111.028 145.713C141.68 145.713 166.528 164.741 166.528 188.213Z" fill="#0B1F4B"/>
                <path d="M147.022 97.5C147.022 119.315 130.233 137 109.522 137C88.8116 137 72.0222 119.315 72.0222 97.5C72.0222 75.6848 88.8116 60.5 109.522 60.5C130.233 60.5 147.022 75.6848 147.022 97.5Z" fill="#0B1F4B"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">Welcome back</h1>
          <p className="text-slate-600 mt-3 text-base sm:text-lg">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="font-semibold text-navy-800 hover:text-navy-600 transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100">
          {/* Error Banner */}
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6" role="alert" aria-live="polite">
              <p className="text-sm font-medium">{err}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full bg-white border border-slate-200 rounded-lg py-3.5 px-4 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all text-base"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-900 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full bg-white border border-slate-200 rounded-lg py-3.5 px-4 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all text-base"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-end">
              <Link href="#" className="text-sm font-medium text-navy-800 hover:text-navy-600 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-navy-800 text-white font-semibold py-4 px-6 rounded-lg hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer Legal */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              By continuing, you agree to our{" "}
              <Link href="/terms/candidates" className="text-navy-800 hover:underline">Terms of Service</Link> and{" "}
              <Link href="#" className="text-navy-800 hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-600 hover:text-navy-800 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
