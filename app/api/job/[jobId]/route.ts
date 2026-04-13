import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { canUserAccessJob } from '@/lib/matching/job-access';

export const dynamic = 'force-dynamic';

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

    const snap = await adminDb.collection('jobs').doc(jobId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const job = snap.data() as Record<string, unknown>;
    const ok = await canUserAccessJob(adminDb, job, decoded.uid);
    if (!ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ job: { id: snap.id, ...job } });
  } catch (e) {
    console.error('GET /api/job/[jobId]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
