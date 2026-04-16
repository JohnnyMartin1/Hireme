import JobWorkspaceNav from "@/components/employer/JobWorkspaceNav";

export default function EmployerJobLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <JobWorkspaceNav />
      {children}
    </div>
  );
}
