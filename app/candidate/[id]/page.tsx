import { prisma } from '@/lib/prisma';
import BackButton from '@/components/BackButton';

interface Props {
  params: { id: string };
}

/**
 * Candidate profile view. Displays the candidate's information including
 * name, headline, skills and resume/video links. Accessible to
 * employers and other job seekers.
 */
export default async function CandidatePage({ params }: Props) {
  const profile = await prisma.profile.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!profile) {
    return <p>Candidate not found.</p>;
  }
  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallback="/search/candidates" />
      <h2 className="text-2xl font-bold my-4">{profile.firstName} {profile.lastName}</h2>
      <p className="mb-2 text-gray-600">{profile.headline}</p>
      <p className="mb-2"><strong>Skills:</strong> {profile.skills.join(', ')}</p>
      {profile.resumeUrl && (
        <p className="mb-2"><strong>Resume:</strong> <a href={profile.resumeUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Download</a></p>
      )}
      {profile.videoUrl && (
        <p className="mb-2"><strong>Video:</strong> <a href={profile.videoUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Watch</a></p>
      )}
    </div>
  );
}