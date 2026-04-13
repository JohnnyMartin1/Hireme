import type { Firestore } from 'firebase-admin/firestore';

/**
 * Whether the signed-in user may access an employer job document.
 */
export async function canUserAccessJob(
  db: Firestore,
  job: Record<string, unknown>,
  userId: string
): Promise<boolean> {
  if ((job.employerId as string) === userId) return true;

  const companyId = job.companyId as string | undefined;
  if (!companyId) return false;

  const snap = await db.collection('users').doc(userId).get();
  const u = snap.data();
  if (!u) return false;
  const role = u.role as string;
  if (role !== 'EMPLOYER' && role !== 'RECRUITER') return false;
  return (u.companyId as string | undefined) === companyId;
}
