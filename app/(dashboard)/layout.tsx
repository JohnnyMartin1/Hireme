import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SidebarNav from '@/components/SidebarNav';
import TopBar from '@/components/TopBar';

/**
 * Layout component used for pages that require authentication and show
 * the application dashboard. It includes a top bar with the app name
 * and current role, a sidebar navigation and renders breadcrumbs and
 * child content. Users who are not logged in are redirected to the
 * login page.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/auth/login');
  }
  const role = (session.user as any).role as string;
  return (
    <div className="flex h-screen">
      <SidebarNav role={role} />
      <div className="flex flex-col flex-1 overflow-y-auto">
        <TopBar role={role} />
        <div className="px-4 py-2">
          {children}
        </div>
      </div>
    </div>
  );
}