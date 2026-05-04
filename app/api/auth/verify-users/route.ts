import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { isServerAdminUser } from '@/lib/admin-access';

async function listAllAuthUserIds(): Promise<string[]> {
  const ids: string[] = [];
  let nextPageToken: string | undefined = undefined;
  do {
    const page = await adminAuth.listUsers(1000, nextPageToken);
    ids.push(...page.users.map((u) => u.uid));
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return ids;
}

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
    const { userIds } = await request.json();

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 });
    }

    const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const callerData = callerDoc.data();
    if (!isServerAdminUser(callerData?.role as string | undefined, decodedToken.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (userIds.length === 0) {
      const allUserIds = await listAllAuthUserIds();
      return NextResponse.json({
        validUserIds: allUserIds,
        totalChecked: allUserIds.length,
        validCount: allUserIds.length,
        invalidCount: 0
      });
    }

    // Check which users still exist in Firebase Auth
    const validUserIds: string[] = [];
    
    // Process in batches to avoid overwhelming Firebase Auth
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const promises = batch.map(async (userId: string) => {
        try {
          await adminAuth.getUser(userId);
          return userId; // User exists
        } catch (error: any) {
          // User doesn't exist in Firebase Auth
          console.log(`User ${userId} not found in Firebase Auth:`, error.code);
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      validUserIds.push(...results.filter((id): id is string => id !== null));
    }

    return NextResponse.json({ 
      validUserIds,
      totalChecked: userIds.length,
      validCount: validUserIds.length,
      invalidCount: userIds.length - validUserIds.length
    });

  } catch (error: any) {
    console.error('Error verifying users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
