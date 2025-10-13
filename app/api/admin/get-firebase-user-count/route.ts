import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // List all users from Firebase Authentication
    const listUsersResult = await adminAuth.listUsers();
    
    // Count users by role by checking their Firestore profiles
    const { adminDb } = await import('@/lib/firebase-admin');
    
    let jobSeekers = 0;
    let employers = 0;
    let recruiters = 0;
    let verifiedCompanies = 0;
    let pendingCompanies = 0;

    // Check each Firebase Auth user's Firestore profile
    for (const userRecord of listUsersResult.users) {
      try {
        const userDoc = await adminDb.collection('users').doc(userRecord.uid).get();
        
        if (userDoc.exists) {
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
      } catch (error) {
        console.error(`Error checking user ${userRecord.uid}:`, error);
      }
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
