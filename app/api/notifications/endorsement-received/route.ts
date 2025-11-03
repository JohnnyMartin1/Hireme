import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendNewEndorsementNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const { userId, endorserName, skill } = await request.json();
    
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

