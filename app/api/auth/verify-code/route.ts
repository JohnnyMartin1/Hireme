import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Find the code in database using Admin SDK
    const codesSnapshot = await adminDb
      .collection('verificationCodes')
      .where('email', '==', email)
      .where('code', '==', code)
      .limit(1)
      .get();

    if (codesSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const codeDoc = codesSnapshot.docs[0];
    const codeData = codeDoc.data();

    // Check if already used
    if (codeData.used) {
      return NextResponse.json(
        { success: false, error: 'This verification code has already been used' },
        { status: 400 }
      );
    }

    // Check if expired
    const expiresAt = new Date(codeData.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This verification code has expired' },
        { status: 400 }
      );
    }

    // Mark code as used using Admin SDK
    await codeDoc.ref.update({
      used: true,
      usedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully' 
    });

  } catch (error: any) {
    console.error('Error in verify-code API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify code' },
      { status: 500 }
    );
  }
}
