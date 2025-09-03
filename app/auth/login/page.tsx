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
      console.log('Attempting Firebase login...');
      const { user, error } = await signInWithFirebase(email, password);

      if (error) {
        console.log('Firebase login error:', error);
        setErr(error);
      } else if (user) {
        console.log('Firebase login successful, user:', user);
        
        // Fetch user profile to determine role
        try {
          const { data: profile, error: profileError } = await getDocument('users', user.uid);
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setErr("Error fetching user profile. Please try again.");
            return;
          }


if (profile) {
  console.log("User profile:", profile);

  // Cast to our shared type
  const p = profile as Partial<UserProfile>;
  const userRole = p.role ?? null;

  // Redirect based on user role
  if (userRole === "EMPLOYER") {
    console.log("Redirecting employer to /home/employer...");
    router.push("/home/employer");
  } else if (userRole === "JOB_SEEKER") {
    console.log("Redirecting job seeker to /home/seeker...");
    router.push("/home/seeker");
  } else if (userRole === "ADMIN") {
    console.log("Redirecting admin to /admin...");
    router.push("/admin");
  } else {
    console.error("Unknown user role:", userRole);
    setErr("Invalid user role. Please contact support.");
  }

          } else {
            console.error('No profile found for user');
            setErr("User profile not found. Please contact support.");
          }
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
          setErr("Error fetching user profile. Please try again.");
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErr("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your HireMe account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              name="email"
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              name="password"
              type="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          {err && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{err}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
