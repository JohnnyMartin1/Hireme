import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    console.log(`Starting account deletion for user: ${userId}`);

    // Delete user data from Firestore
    const batch = adminDb.batch();

    // Delete user profile
    const userRef = adminDb.collection('users').doc(userId);
    batch.delete(userRef);

    // Delete user's messages and message threads
    const messageThreadsQuery = await adminDb
      .collection('messageThreads')
      .where('participantIds', 'array-contains', userId)
      .get();
    
    messageThreadsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete individual messages sent by user
    const messagesQuery = await adminDb
      .collection('messages')
      .where('senderId', '==', userId)
      .get();
    
    messagesQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete profile views by user
    const profileViewsQuery = await adminDb
      .collection('profileViews')
      .where('viewerId', '==', userId)
      .get();
    
    profileViewsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete profile views of user
    const userProfileViewsQuery = await adminDb
      .collection('profileViews')
      .where('viewedUserId', '==', userId)
      .get();
    
    userProfileViewsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete saved candidates by user
    const savedCandidatesQuery = await adminDb
      .collection('savedCandidates')
      .where('userId', '==', userId)
      .get();
    
    savedCandidatesQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete endorsements for user
    const endorsementsQuery = await adminDb
      .collection('endorsements')
      .where('userId', '==', userId)
      .get();
    
    endorsementsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete company ratings by user
    const companyRatingsQuery = await adminDb
      .collection('companyRatings')
      .where('userId', '==', userId)
      .get();
    
    companyRatingsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete email verification tokens
    const emailTokensQuery = await adminDb
      .collection('emailVerificationTokens')
      .where('userId', '==', userId)
      .get();
    
    emailTokensQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // If user is an employer, delete their jobs
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.role === 'EMPLOYER') {
      const jobsQuery = await adminDb
        .collection('jobs')
        .where('employerId', '==', userId)
        .get();
      
      jobsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // If user is a recruiter, delete their company invitation
    if (userDoc.exists && userDoc.data()?.role === 'RECRUITER') {
      const companyInvitationsQuery = await adminDb
        .collection('companyInvitations')
        .where('invitedEmail', '==', userDoc.data()?.email)
        .get();
      
      companyInvitationsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Commit the batch delete
    await batch.commit();

    console.log(`Firestore data deleted for user: ${userId}`);

    // Delete the Firebase Auth user
    try {
      await adminAuth.deleteUser(userId);
      console.log(`Firebase Auth user deleted: ${userId}`);
    } catch (authError) {
      console.error('Error deleting Firebase Auth user:', authError);
      // Continue even if auth deletion fails - the Firestore data is already deleted
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account',
      details: error.message 
    }, { status: 500 });
  }
}
