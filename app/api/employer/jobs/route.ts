import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET — list jobs visible to the authenticated employer or recruiter.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const profile = userSnap.data();
    const role = profile?.role as string | undefined;
    if (role !== 'EMPLOYER' && role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = profile?.companyId as string | undefined;
    const out = new Map<string, Record<string, unknown> & { id: string }>();

    const mine = await adminDb.collection('jobs').where('employerId', '==', uid).get();
    mine.forEach((d) => out.set(d.id, { id: d.id, ...d.data() }));

    if (companyId) {
      const companyJobs = await adminDb.collection('jobs').where('companyId', '==', companyId).get();
      companyJobs.forEach((d) => {
        const j = d.data();
        if (role === 'EMPLOYER' || role === 'RECRUITER') {
          out.set(d.id, { id: d.id, ...j });
        }
      });
    }

    const merged = [...out.values()];
    merged.sort((a, b) => {
      const ca = a.createdAt as { toMillis?: () => number } | undefined;
      const cb = b.createdAt as { toMillis?: () => number } | undefined;
      const ta = ca?.toMillis?.() ?? new Date(String(a.postedDate || 0)).getTime();
      const tb = cb?.toMillis?.() ?? new Date(String(b.postedDate || 0)).getTime();
      return tb - ta;
    });

    return NextResponse.json({ jobs: merged });
  } catch (e) {
    console.error('GET /api/employer/jobs', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
