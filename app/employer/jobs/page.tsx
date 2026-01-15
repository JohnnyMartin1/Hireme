"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building, ArrowLeft } from "lucide-react";
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
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}}>
      <div className="w-full md:max-w-6xl md:mx-auto px-0 sm:px-3 md:px-6 pt-12 sm:pt-16 md:pt-20 pb-4 sm:pb-6 md:pb-10 min-w-0">
        <div className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link 
                href="/home/employer" 
                className="flex items-center text-navy-800 font-semibold hover:text-navy-900 transition-all duration-200 bg-sky-200/10 hover:bg-sky-200/20 px-3 sm:px-4 py-2 rounded-full w-fit min-h-[44px] text-sm sm:text-base hover:shadow-md hover:scale-105 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-navy-900 break-words">Manage Jobs</h1>
            </div>
            <Link
              href="/employer/job/new"
              className="bg-navy-800 text-white font-semibold py-2.5 sm:py-2.5 px-4 sm:px-5 rounded-lg hover:bg-navy-700 transition-colors duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[44px] w-full sm:w-auto"
            >
              <Building className="h-4 w-4" />
              <span>Post New Job</span>
            </Link>
          </div>
          <EmployerJobsList />
        </div>
      </div>
    </main>
  );
}
