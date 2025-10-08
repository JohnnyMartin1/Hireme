import { NextRequest, NextResponse } from 'next/server';
import { createVerificationToken, sendVerificationEmailViaResend } from '@/lib/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, userName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Create verification token
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

