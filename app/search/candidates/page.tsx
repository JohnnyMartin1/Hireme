import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import Link from 'next/link';

interface CandidateSearchParams {
  q?: string;
  skills?: string;
  school?: string;
  location?: string;
  sort?: string;
}

async function CandidateResults({ searchParams }: { searchParams: CandidateSearchParams }) {
  const where: any = { visibility: true };
  if (searchParams.q) {
    where.OR = [
      { firstName: { contains: searchParams.q, mode: 'insensitive' } },
      { lastName: { contains: searchParams.q, mode: 'insensitive' } },
      { headline: { contains: searchParams.q, mode: 'insensitive' } },
    ];
  }
  if (searchParams.skills) {
    const skillsArr = searchParams.skills.split(',').map((s) => s.trim());
    where.skills = { hasSome: skillsArr };
  }
  if (searchParams.school) {
    where.school = { contains: searchParams.school, mode: 'insensitive' };
  }
  if (searchParams.location) {
    const [city, state] = searchParams.location.split(',').map((s) => s.trim());
    if (city) where.locationCity = { equals: city, mode: 'insensitive' };
    if (state) where.locationState = { equals: state, mode: 'insensitive' };
  }
  let orderBy: any = {};
  if (searchParams.sort === 'name') {
    orderBy = { firstName: 'asc' };
  } else if (searchParams.sort === 'recent') {
    orderBy = { user: { createdAt: 'desc' } };
  }
  const candidates = await prisma.profile.findMany({
    where,
    orderBy,
    take: 20,
    include: { user: true },
  });
  return (
    <ul className="space-y-4">
      {candidates.map((cand) => (
        <li key={cand.id} className="border p-4 rounded bg-white">
          <h3 className="font-semibold text-lg">{cand.firstName} {cand.lastName}</h3>
          <p className="text-sm text-gray-600">{cand.headline || 'No headline'}</p>
          <p className="text-sm text-gray-500">Skills: {cand.skills.join(', ')}</p>
          <Link href={`/candidate/${cand.id}`} className="text-blue-600 hover:underline text-sm">View profile</Link>
        </li>
      ))}
      {candidates.length === 0 && <p>No candidates found.</p>}
    </ul>
  );
}

/**
 * Candidate search page. Provides filters for skills, school and location,
 * and sorts results. Searches the Profile model and includes user
 * information.
 */
export default function CandidateSearchPage({ searchParams }: { searchParams: CandidateSearchParams }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Candidate Search</h2>
      <form action="/search/candidates" method="get" className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <input name="q" placeholder="Name or keyword" defaultValue={searchParams.q} className="px-3 py-2 border rounded" />
        <input name="skills" placeholder="Skills (comma separated)" defaultValue={searchParams.skills} className="px-3 py-2 border rounded" />
        <input name="school" placeholder="School" defaultValue={searchParams.school} className="px-3 py-2 border rounded" />
        <input name="location" placeholder="City, State" defaultValue={searchParams.location} className="px-3 py-2 border rounded" />
        <select name="sort" defaultValue={searchParams.sort} className="px-3 py-2 border rounded">
          <option value="">Sort by</option>
          <option value="recent">Most recent</option>
          <option value="name">Name A-Z</option>
        </select>
        <button type="submit" className="col-span-1 md:col-span-5 px-4 py-2 bg-blue-600 text-white rounded">Search</button>
      </form>
      <Suspense fallback={<p>Loading...</p>}>
        {/* @ts-expect-error Async Server Component */}
        <CandidateResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}