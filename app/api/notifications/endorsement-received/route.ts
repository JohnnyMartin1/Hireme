import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendNewEndorsementNotification } from '@/lib/notifications';
import { rateLimitHitAsync } from '@/lib/api-rate-limit';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      await adminAuth.verifyIdToken(authHeader.slice(7));
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId, endorserName, skill } = await request.json();
    const rl = await rateLimitHitAsync("notifications-endorsement-received", request, {
      windowMs: 60_000,
      max: 20,
    });
    if (rl != null) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl) } });
    }
    
    if (!userId || !endorserName || !skill) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get candidate profile
    const candidateDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!candidateDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const candidateProfile = candidateDoc.data();
    
    if (candidateProfile?.role === 'JOB_SEEKER' && candidateProfile?.email) {
      const candidateName = `${candidateProfile?.firstName || ''} ${candidateProfile?.lastName || ''}`.trim() || 'there';
      
      await sendNewEndorsementNotification(
        userId,
        candidateProfile.email,
        candidateName,
        endorserName,
        skill
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'No notification needed' });
  } catch (error: any) {
    console.error('Error sending endorsement notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

