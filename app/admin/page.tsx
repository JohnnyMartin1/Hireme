import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Basic admin dashboard. Displays counts of users, employers and jobs.
 * Only accessible to users with the ADMIN role.
 */
export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN') {
    return <p>You do not have permission to view this page.</p>;
  }
  const userCount = await prisma.user.count();
  const employerCount = await prisma.employer.count();
  const jobCount = await prisma.job.count();
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <div className="space-y-2">
        <p>Total users: {userCount}</p>
        <p>Total employers: {employerCount}</p>
        <p>Total jobs: {jobCount}</p>
      </div>
      <p className="mt-4 text-sm text-gray-600">Further admin tools are not yet implemented.</p>
    </div>
  );
}