import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token (admin only)
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get all users from Firestore
    const usersSnapshot = await adminDb.collection('users').get();
    const firestoreUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${firestoreUsers.length} users in Firestore`);

    // Check which users exist in Firebase Auth
    const orphanedUsers: any[] = [];
    const validUsers: any[] = [];

    // Process in batches to avoid overwhelming Firebase Auth
    const batchSize = 10;
    for (let i = 0; i < firestoreUsers.length; i += batchSize) {
      const batch = firestoreUsers.slice(i, i + batchSize);
      
      const promises = batch.map(async (user: any) => {
        try {
          await adminAuth.getUser(user.id);
          validUsers.push(user);
        } catch (error: any) {
          console.log(`Orphaned user found: ${user.id} (${user.email || 'no email'})`);
          orphanedUsers.push(user);
        }
      });
      
      await Promise.all(promises);
    }

    console.log(`Found ${orphanedUsers.length} orphaned users, ${validUsers.length} valid users`);

    // Delete orphaned users from Firestore
    const deletedUsers: string[] = [];
    for (const orphanedUser of orphanedUsers) {
      try {
        await adminDb.collection('users').doc(orphanedUser.id).delete();
        deletedUsers.push(orphanedUser.id);
        console.log(`Deleted orphaned user: ${orphanedUser.id}`);
      } catch (error) {
        console.error(`Failed to delete orphaned user ${orphanedUser.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      stats: {
        totalFirestoreUsers: firestoreUsers.length,
        validUsers: validUsers.length,
        orphanedUsers: orphanedUsers.length,
        deletedUsers: deletedUsers.length
      },
      deletedUserIds: deletedUsers
    });

  } catch (error: any) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup orphaned users',
      details: error.message 
    }, { status: 500 });
  }
}
