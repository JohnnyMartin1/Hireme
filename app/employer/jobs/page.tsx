"use client";
import Link from "next/link";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEmployerJobs } from "@/lib/firebase-firestore";
import { Building, ArrowLeft } from "lucide-react";

export default function EmployerJobsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data } = await getEmployerJobs(user.uid);
      setJobs(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  if (!user || !profile) return null;

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full md:max-w-6xl md:mx-auto px-0 sm:px-3 md:p-6 py-4 sm:py-6 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 px-2 sm:px-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link href="/home/employer" className="text-green-700 hover:underline flex items-center min-h-[44px] text-sm sm:text-base flex-shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">Your Active Jobs</h1>
          </div>
          <Link
            href="/employer/job/new"
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            <Building className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Post New Job</span>
            <span className="sm:hidden">Post Job</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="w-full min-w-0 text-center py-12 sm:py-16 text-sm sm:text-base text-gray-600 px-2 sm:px-0">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="w-full min-w-0 text-center py-12 sm:py-16 text-sm sm:text-base text-gray-600 px-2 sm:px-0">You have no active jobs.</div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="w-full min-w-0 bg-white rounded-none sm:rounded-xl shadow p-4 sm:p-5 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{job.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 break-words">
                      {job.locationCity && job.locationState
                        ? `${job.locationCity}, ${job.locationState}`
                        : "Remote"}
                      {" • "}{job.employment}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto">
                    <Link href={`/employer/job/${job.id}`} className="text-green-700 hover:underline text-sm sm:text-base min-h-[44px] flex items-center px-3 sm:px-0">View</Link>
                    <Link href={`/employer/job/${job.id}/edit`} className="text-blue-700 hover:underline text-sm sm:text-base min-h-[44px] flex items-center px-3 sm:px-0">Edit</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


