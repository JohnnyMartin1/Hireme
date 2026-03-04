import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const maxDuration = 60;

const BATCH_LIMIT = 500;
const MAX_ORPHANS_PER_RUN = 15;

/** Delete all Firestore data for a user (same as delete-account, but no Auth delete). */
async function deleteAllUserData(userId: string, userData?: { role?: string; email?: string }): Promise<void> {
  const refs: any[] = [];
  refs.push(adminDb.collection('users').doc(userId));

  const addRefs = (snap: { docs: { ref: any }[] }) => {
    snap.docs.forEach(doc => refs.push(doc.ref));
  };

  addRefs(await adminDb.collection('messageThreads').where('participantIds', 'array-contains', userId).get());
  addRefs(await adminDb.collection('messages').where('senderId', '==', userId).get());
  addRefs(await adminDb.collection('profileViews').where('viewerId', '==', userId).get());
  addRefs(await adminDb.collection('profileViews').where('viewedUserId', '==', userId).get());
  addRefs(await adminDb.collection('savedCandidates').where('userId', '==', userId).get());
  addRefs(await adminDb.collection('endorsements').where('userId', '==', userId).get());
  addRefs(await adminDb.collection('companyRatings').where('userId', '==', userId).get());
  addRefs(await adminDb.collection('emailVerificationTokens').where('userId', '==', userId).get());
  if (userData?.role === 'EMPLOYER') {
    addRefs(await adminDb.collection('jobs').where('employerId', '==', userId).get());
  }
  if (userData?.role === 'RECRUITER' && userData?.email) {
    addRefs(await adminDb.collection('companyInvitations').where('invitedEmail', '==', userData.email).get());
  }

  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = adminDb.batch();
    refs.slice(i, i + BATCH_LIMIT).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Allow either admin Bearer (Firebase token) or cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!isCron) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();
        const adminEmail = process.env.ADMIN_EMAIL || 'officialhiremeapp@gmail.com';
        const isAdminByRole = userData?.role === 'ADMIN';
        const isAdminByEmail = decodedToken.email === adminEmail;
        if (!isAdminByRole && !isAdminByEmail) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const usersSnapshot = await adminDb.collection('users').get();
    const firestoreUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[cleanup-orphaned] Found ${firestoreUsers.length} users in Firestore`);

    const orphanedUsers: any[] = [];
    const validUsers: any[] = [];
    const batchSize = 10;

    for (let i = 0; i < firestoreUsers.length; i += batchSize) {
      const batch = firestoreUsers.slice(i, i + batchSize);
      const promises = batch.map(async (user: any) => {
        try {
          await adminAuth.getUser(user.id);
          validUsers.push(user);
        } catch {
          orphanedUsers.push(user);
        }
      });
      await Promise.all(promises);
    }

    console.log(`[cleanup-orphaned] Orphaned: ${orphanedUsers.length}, Valid: ${validUsers.length}`);

    const toProcess = orphanedUsers.slice(0, MAX_ORPHANS_PER_RUN);
    const deletedUsers: string[] = [];
    for (const orphanedUser of toProcess) {
      try {
        await deleteAllUserData(orphanedUser.id, {
          role: orphanedUser.role,
          email: orphanedUser.email
        });
        deletedUsers.push(orphanedUser.id);
        console.log(`[cleanup-orphaned] Deleted all data for: ${orphanedUser.id} (${orphanedUser.email || 'no email'})`);
      } catch (error: any) {
        console.error(`[cleanup-orphaned] Failed to delete ${orphanedUser.id}:`, error);
      }
    }
    const remaining = orphanedUsers.length - toProcess.length;

    return NextResponse.json({
      success: true,
      message: remaining > 0
        ? `Cleanup completed. Deleted ${deletedUsers.length} orphaned users. ${remaining} remaining — run again to continue.`
        : 'Cleanup completed',
      stats: {
        totalFirestoreUsers: firestoreUsers.length,
        validUsers: validUsers.length,
        orphanedUsers: orphanedUsers.length,
        deletedUsers: deletedUsers.length,
        remainingOrphans: remaining
      },
      deletedUserIds: deletedUsers,
      remainingOrphans: remaining
    });
  } catch (error: any) {
    console.error('[cleanup-orphaned] Error:', error);
    return NextResponse.json({
      error: 'Failed to cleanup orphaned users',
      details: error.message
    }, { status: 500 });
  }
}
