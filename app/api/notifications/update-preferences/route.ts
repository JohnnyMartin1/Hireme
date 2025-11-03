import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Notification preferences update request received');
    
    const body = await request.json();
    const { userId, preferences } = body;

    console.log('User ID:', userId);
    console.log('Preferences to update:', preferences);

    if (!userId) {
      console.error('❌ Missing userId');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!preferences || typeof preferences !== 'object') {
      console.error('❌ Invalid preferences:', preferences);
      return NextResponse.json(
        { success: false, error: 'Valid preferences object is required' },
        { status: 400 }
      );
    }

    // Use Firebase Admin SDK (bypasses security rules, runs on server)
    const userRef = adminDb.collection('users').doc(userId);
    
    // Get current preferences
    const userDoc = await userRef.get();
    const currentPreferences = userDoc.exists 
      ? (userDoc.data()?.notificationPreferences || {})
      : {};
    
    console.log('📄 Current preferences:', currentPreferences);
    
    // Merge with new preferences
    const updatedPreferences = { ...currentPreferences, ...preferences };
    console.log('📝 Updated preferences:', updatedPreferences);
    
    // Update the document (or create if it doesn't exist)
    await userRef.set({
      notificationPreferences: updatedPreferences,
      updatedAt: new Date(),
    }, { merge: true });

    console.log('✅ Preferences updated successfully via Admin SDK');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in API route:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

