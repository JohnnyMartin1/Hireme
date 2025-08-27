import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

/**
 * Home page for employers. Shows a list of recommended candidates based on the
 * tags of the employer's active jobs. Also presents quick actions such as
 * posting a job and searching candidates.
 */
export default async function EmployerHomePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  let candidates: any[] = [];
  if (userId) {
    // Get employer record
    const employer = await prisma.employer.findUnique({ where: { userId } });
    if (employer) {
      // Gather tags from all active jobs
      const jobs = await prisma.job.findMany({ where: { employerId: employer.id, isActive: true } });
      const tags = jobs.flatMap((job) => job.tags);
      const uniqueTags = Array.from(new Set(tags));
      if (uniqueTags.length > 0) {
        // Find candidates whose profiles have overlapping skills
        candidates = await prisma.profile.findMany({
          where: {
            skills: {
              hasSome: uniqueTags,
            },
            visibility: true,
          },
          take: 5,
          include: { user: true },
        });
      }
    }
  }
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Recommended Candidates</h2>
      {candidates.length === 0 ? (
        <p>No recommendations yet. Post a job to get matched with candidates.</p>
      ) : (
        <ul className="space-y-4">
          {candidates.map((cand) => (
            <li key={cand.id} className="border p-4 rounded bg-white">
              <h3 className="font-semibold text-lg">{cand.firstName} {cand.lastName}</h3>
              <p className="text-sm text-gray-600">{cand.headline || 'No headline provided'}</p>
              <p className="text-sm text-gray-500">Skills: {cand.skills.join(', ')}</p>
              <Link href={`/candidate/${cand.id}`} className="text-blue-600 hover:underline text-sm">View profile</Link>
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-2xl font-bold my-4">Quick actions</h2>
      <div className="space-y-2">
        <Link href="/employer/job/new" className="block text-blue-600 hover:underline">Post a job</Link>
        <Link href="/search/candidates" className="block text-blue-600 hover:underline">Search candidates</Link>
        <Link href="/account/company" className="block text-blue-600 hover:underline">Finish company profile</Link>
      </div>
    </div>
  );
}