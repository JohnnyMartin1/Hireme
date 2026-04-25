import { Suspense } from "react";
import JobWorkspaceNav from "@/components/employer/JobWorkspaceNav";

export default function EmployerJobLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      <Suspense fallback={<div className="border-b border-slate-200 bg-white py-4 px-4 text-sm text-slate-500">Loading job…</div>}>
        <JobWorkspaceNav />
      </Suspense>
      <div className="pt-2 sm:pt-3">{children}</div>
    </div>
  );
}
