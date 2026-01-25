import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token and check if user is admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      
      // Check if user is admin
      const { adminDb } = await import('@/lib/firebase-admin');
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      if (userData?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // List all users from Firebase Authentication
    const listUsersResult = await adminAuth.listUsers();
    
    // Count users by role by checking their Firestore profiles
    const { adminDb } = await import('@/lib/firebase-admin');
    
    let jobSeekers = 0;
    let employers = 0;
    let recruiters = 0;
    let verifiedCompanies = 0;
    let pendingCompanies = 0;

    // Optimize: Process Firestore queries in parallel batches instead of sequentially
    const batchSize = 10;
    const userIds = listUsersResult.users.map(user => user.uid);
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Fetch all user docs in parallel for this batch
      const userDocPromises = batch.map(userId => 
        adminDb.collection('users').doc(userId).get().catch(() => null)
      );
      
      const userDocs = await Promise.all(userDocPromises);
      
      // Process results
      userDocs.forEach((userDoc) => {
        if (userDoc?.exists) {
          const userData = userDoc.data();
          const role = userData?.role;
          
          if (role === 'JOB_SEEKER') {
            jobSeekers++;
          } else if (role === 'EMPLOYER') {
            employers++;
            if (userData?.status === 'verified') {
              verifiedCompanies++;
            } else if (userData?.status === 'pending_verification') {
              pendingCompanies++;
            }
          } else if (role === 'RECRUITER') {
            recruiters++;
          }
        }
      });
    }

    return NextResponse.json({
      totalUsers: listUsersResult.users.length,
      jobSeekers,
      employers,
      recruiters,
      verifiedCompanies,
      pendingCompanies
    });

  } catch (error: any) {
    console.error('Error getting Firebase user count:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to get user count' 
    }, { status: 500 });
  }
}
