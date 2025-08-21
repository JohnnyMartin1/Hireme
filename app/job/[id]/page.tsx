import { prisma } from '@/lib/prisma';
import BackButton from '@/components/BackButton';

interface Props {
  params: { id: string };
}

/**
 * Job details page. Shows the full job description, location, salary and
 * tags. Accessible to job seekers. Employers can also view but cannot
 * apply from this page.
 */
export default async function JobPage({ params }: Props) {
  const job = await prisma.job.findUnique({ where: { id: params.id }, include: { employer: { include: { user: true } } } });
  if (!job) {
    return <p>Job not found.</p>;
  }
  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/search/jobs" />
      <h2 className="text-2xl font-bold my-4">{job.title}</h2>
      <p className="mb-2 text-gray-600">{job.description}</p>
      <p className="mb-2"><strong>Location:</strong> {job.locationCity}, {job.locationState}</p>
      <p className="mb-2"><strong>Employment Type:</strong> {job.employment}</p>
      {job.salaryMin !== null && job.salaryMax !== null && (
        <p className="mb-2"><strong>Salary:</strong> ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}</p>
      )}
      {job.tags.length > 0 && (
        <p className="mb-2"><strong>Tags:</strong> {job.tags.join(', ')}</p>
      )}
      <p className="mt-4 text-sm text-gray-600">Posted by {job.employer.companyName}</p>
    </div>
  );
}