import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase().trim();
    const rateLimitRef = adminDb.collection('verifyCodeAttempts').doc(emailKey);
    const rateLimitSnap = await rateLimitRef.get();
    const now = Date.now();
    const data = rateLimitSnap.data();
    let attempts = data?.attempts ?? 0;
    let windowStart = data?.windowStart ?? now;
    if (now - windowStart > WINDOW_MS) {
      attempts = 0;
      windowStart = now;
    }
    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }
    await rateLimitRef.set({ attempts: attempts + 1, windowStart }, { merge: true });

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

    // Find the user by email and mark email as verified
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      await userDoc.ref.update({
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString()
      });
    }

    await rateLimitRef.delete();

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
