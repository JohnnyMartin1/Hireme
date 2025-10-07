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
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/home/employer" className="text-green-700 hover:underline flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Your Active Jobs</h1>
          </div>
          <Link
            href="/employer/job/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Building className="h-4 w-4 mr-2" />
            Post New Job
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-600">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-600">You have no active jobs.</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600">
                      {job.locationCity && job.locationState
                        ? `${job.locationCity}, ${job.locationState}`
                        : "Remote"}
                      {" • "}{job.employment}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/employer/job/${job.id}`} className="text-green-700 hover:underline">View</Link>
                    <Link href={`/employer/job/${job.id}/edit`} className="text-blue-700 hover:underline">Edit</Link>
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


