"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building } from "lucide-react";
import EmployerJobsList from "@/components/EmployerJobsList";

export default function EmployerJobsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
    if (profile && profile.role !== "EMPLOYER" && profile.role !== "RECRUITER") {
      router.push("/home/seeker");
      return;
    }
  }, [user, profile, loading, router]);

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full bg-slate-50">
      <div className="w-full md:max-w-6xl md:mx-auto px-0 sm:px-3 md:px-6 pt-12 sm:pt-16 md:pt-20 pb-4 sm:pb-6 md:pb-10 min-w-0">
        <div className="w-full min-w-0 bg-white p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-navy-900 break-words">Requisition Portfolio</h1>
            </div>
            <Link
              href="/employer/job/new"
              className="bg-navy-800 text-white font-semibold py-2.5 sm:py-2.5 px-4 sm:px-5 rounded-lg hover:bg-navy-700 transition-colors duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[44px] w-full sm:w-auto"
            >
              <Building className="h-4 w-4" />
              <span>Post New Job</span>
            </Link>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Choose a role to work, review pipeline health, or source more candidates.
          </p>
          <EmployerJobsList mode="portfolio" />
        </div>
      </div>
    </main>
  );
}
