import { NextRequest, NextResponse } from 'next/server';
import { rateLimitResponseIfExceeded } from '@/lib/api-rate-limit';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendProfileViewedNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader.slice(7));
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { candidateId, viewerId } = await request.json();
    
    if (!candidateId || !viewerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (decodedToken.uid !== viewerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rl = await rateLimitResponseIfExceeded('notifications-profile-viewed', request, {
      windowMs: 60 * 60 * 1000,
      max: 120,
      uid: viewerId,
    });
    if (rl) return rl;

    // Get viewer and candidate profiles
    const [viewerDoc, candidateDoc] = await Promise.all([
      adminDb.collection('users').doc(viewerId).get(),
      adminDb.collection('users').doc(candidateId).get()
    ]);

    if (!viewerDoc.exists || !candidateDoc.exists) {
      return NextResponse.json({ error: 'User profiles not found' }, { status: 404 });
    }

    const viewerProfile = viewerDoc.data();
    const candidateProfile = candidateDoc.data();

    // Only send notification if viewer is recruiter/employer and candidate is job seeker
    if (
      (viewerProfile?.role === 'EMPLOYER' || viewerProfile?.role === 'RECRUITER') &&
      candidateProfile?.role === 'JOB_SEEKER' &&
      candidateProfile?.email
    ) {
      const recruiterName = `${viewerProfile?.firstName || ''} ${viewerProfile?.lastName || ''}`.trim() || 'A recruiter';
      const companyName = viewerProfile?.companyName || viewerProfile?.company || 'a company';
      const candidateName = `${candidateProfile?.firstName || ''} ${candidateProfile?.lastName || ''}`.trim() || 'there';
      
      await sendProfileViewedNotification(
        candidateId,
        candidateProfile.email,
        candidateName,
        recruiterName,
        companyName
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'No notification needed' });
  } catch (error: any) {
    console.error('Error sending profile view notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

