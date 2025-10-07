"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployerSignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to type selection page
    router.push('/auth/signup/employer/type');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
