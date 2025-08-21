import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Sidebar />
      </div>
      <div className="lg:col-span-2">
        {children}
      </div>
    </div>
  );
}
