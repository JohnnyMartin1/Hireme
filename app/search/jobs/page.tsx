import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import Link from 'next/link';

interface SearchParams {
  q?: string;
  tags?: string;
  location?: string;
  type?: string;
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const where: any = { isActive: true };
  if (searchParams.q) {
    where.title = { contains: searchParams.q, mode: 'insensitive' };
  }
  if (searchParams.tags) {
    const tagsArr = searchParams.tags.split(',').map((t) => t.trim());
    where.tags = { hasSome: tagsArr };
  }
  if (searchParams.location) {
    const [city, state] = searchParams.location.split(',').map((s) => s.trim());
    if (city) where.locationCity = { equals: city, mode: 'insensitive' };
    if (state) where.locationState = { equals: state, mode: 'insensitive' };
  }
  if (searchParams.type) {
    where.employment = searchParams.type as any;
  }
  const jobs = await prisma.job.findMany({ where, take: 20 });
  return (
    <ul className="space-y-4">
      {jobs.map((job) => (
        <li key={job.id} className="border p-4 rounded bg-white">
          <h3 className="font-semibold text-lg">{job.title}</h3>
          <p className="text-sm text-gray-600">{job.description.substring(0, 80)}...</p>
          <p className="text-sm text-gray-500">{job.locationCity}, {job.locationState}</p>
          <Link href={`/job/${job.id}`} className="text-blue-600 hover:underline text-sm">View job</Link>
        </li>
      ))}
      {jobs.length === 0 && <p>No jobs found.</p>}
    </ul>
  );
}

/**
 * Jobs search page. Parses query parameters from the URL and performs a
 * database query against the Job model. Provides a simple search form.
 */
export default function JobSearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Job Search</h2>
      {/* Search form submits query params via GET */}
      <form action="/search/jobs" method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input name="q" placeholder="Keyword" defaultValue={searchParams.q} className="px-3 py-2 border rounded" />
        <input name="tags" placeholder="Tags (comma separated)" defaultValue={searchParams.tags} className="px-3 py-2 border rounded" />
        <input name="location" placeholder="City, State" defaultValue={searchParams.location} className="px-3 py-2 border rounded" />
        <select name="type" defaultValue={searchParams.type} className="px-3 py-2 border rounded">
          <option value="">All types</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="PART_TIME">Part-time</option>
          <option value="FULL_TIME">Full-time</option>
          <option value="CONTRACT">Contract</option>
        </select>
        <button type="submit" className="col-span-1 md:col-span-4 px-4 py-2 bg-blue-600 text-white rounded">Search</button>
      </form>
      <Suspense fallback={<p>Loading...</p>}>
        {/* @ts-expect-error Async Server Component */}
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}