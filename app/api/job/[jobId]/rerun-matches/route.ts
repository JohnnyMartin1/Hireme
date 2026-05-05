import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponseIfExceeded } from '@/lib/api-rate-limit';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { canUserAccessJob } from '@/lib/matching/job-access';
import { runJobMatching } from '@/lib/matching/job-matching';

export const dynamic = 'force-dynamic';

export async function POST(
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

    const rl = await rateLimitResponseIfExceeded(`job-rerun-matches:${jobId}`, request, {
      windowMs: 60 * 60 * 1000,
      max: 8,
      uid: decoded.uid,
    });
    if (rl) return rl;

    await runJobMatching(adminDb, jobId);

    return NextResponse.json({ success: true, message: 'Matches regenerated' });
  } catch (e) {
    console.error('POST /api/job/[jobId]/rerun-matches', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
