import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { createVerificationToken, sendVerificationEmailViaResend } from '@/lib/email-verification';

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

    const { userId, email, userName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    if (decodedToken.uid !== userId || decodedToken.email !== email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = await createVerificationToken(userId, email);

    // Send email via Resend
    await sendVerificationEmailViaResend(email, token, userName);

    return NextResponse.json({ 
      success: true,
      message: 'Verification email sent successfully' 
    });

  } catch (error: any) {
    console.error('Error in send-verification API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    );
  }
}

