import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { canUserAccessJob } from '@/lib/matching/job-access';

export const dynamic = 'force-dynamic';

/**
 * GET ranked matches for a job (employer must own or share company).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
    }

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const job = jobSnap.data() as Record<string, unknown>;
    const ok = await canUserAccessJob(adminDb, job, decoded.uid);
    if (!ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const matchesSnap = await adminDb
      .collection('jobMatches')
      .where('jobId', '==', jobId)
      .orderBy('overallScore', 'desc')
      .get();

    const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const candidateIds = [...new Set(matches.map((m: any) => m.candidateId).filter(Boolean))];
    const previews: Record<string, Record<string, unknown>> = {};
    await Promise.all(
      candidateIds.map(async (cid) => {
        const u = await adminDb.collection('users').doc(cid).get();
        if (!u.exists) return;
        const p = u.data() as Record<string, unknown>;
        previews[cid] = {
          firstName: p.firstName ?? null,
          lastName: p.lastName ?? null,
          headline: p.headline ?? null,
          school: p.school ?? null,
          major: p.major ?? null,
          location: p.location ?? null,
          resumeUrl: p.resumeUrl ?? null,
          videoUrl: p.videoUrl ?? null,
        };
      })
    );

    const matchesWithPreview = matches.map((m: any) => ({
      ...m,
      candidatePreview: previews[m.candidateId] || null,
    }));

    return NextResponse.json({
      job: { id: jobSnap.id, ...job },
      matches: matchesWithPreview,
    });
  } catch (e) {
    console.error('GET /api/job/[jobId]/matches', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
