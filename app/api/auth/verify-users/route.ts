import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    // If userIds is empty array, return all Firebase Auth users
    if (Array.isArray(userIds) && userIds.length === 0) {
      const listUsersResult = await adminAuth.listUsers();
      const allUserIds = listUsersResult.users.map(user => user.uid);
      
      return NextResponse.json({ 
        validUserIds: allUserIds,
        totalChecked: allUserIds.length,
        validCount: allUserIds.length,
        invalidCount: 0
      });
    }

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 });
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
    return NextResponse.json({ 
      error: 'Failed to verify users',
      details: error.message 
    }, { status: 500 });
  }
}
