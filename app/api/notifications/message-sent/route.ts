import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { 
  sendNewRecruiterMessageNotification, 
  sendRecruiterFollowUpNotification 
} from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const { threadId, senderId, messageContent } = await request.json();
    
    if (!threadId || !senderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get thread to find recipient
    const threadDoc = await adminDb.collection('messageThreads').doc(threadId).get();
    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const threadData = threadDoc.data();
    const recipientId = threadData?.participantIds?.find((id: string) => id !== senderId);
    
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Get sender and recipient profiles
    const [senderDoc, recipientDoc] = await Promise.all([
      adminDb.collection('users').doc(senderId).get(),
      adminDb.collection('users').doc(recipientId).get()
    ]);

    if (!senderDoc.exists || !recipientDoc.exists) {
      return NextResponse.json({ error: 'User profiles not found' }, { status: 404 });
    }

    const senderProfile = senderDoc.data();
    const recipientProfile = recipientDoc.data();

    // Only send notification if sender is recruiter/employer and recipient is candidate
    if (
      (senderProfile?.role === 'EMPLOYER' || senderProfile?.role === 'RECRUITER') &&
      recipientProfile?.role === 'JOB_SEEKER' &&
      recipientProfile?.email
    ) {
      // Check if this is the first message in the thread
      const messagesSnapshot = await adminDb
        .collection('messages')
        .where('threadId', '==', threadId)
        .get();
      
      const isFirstMessage = messagesSnapshot.size <= 1;

      const recruiterName = `${senderProfile?.firstName || ''} ${senderProfile?.lastName || ''}`.trim() || 'A recruiter';
      const companyName = senderProfile?.companyName || senderProfile?.company || 'a company';
      const candidateName = `${recipientProfile?.firstName || ''} ${recipientProfile?.lastName || ''}`.trim() || 'there';

      if (isFirstMessage) {
        await sendNewRecruiterMessageNotification(
          recipientId,
          recipientProfile.email,
          candidateName,
          recruiterName,
          companyName,
          messageContent || ''
        );
      } else {
        await sendRecruiterFollowUpNotification(
          recipientId,
          recipientProfile.email,
          candidateName,
          recruiterName,
          companyName,
          messageContent || '',
          threadId
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'No notification needed' });
  } catch (error: any) {
    console.error('Error sending message notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

