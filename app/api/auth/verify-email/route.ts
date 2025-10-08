import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailWithToken } from '@/lib/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const result = await verifyEmailWithToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      email: result.email,
      message: 'Email verified successfully'
    });

  } catch (error: any) {
    console.error('Error in verify-email API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify email' },
      { status: 500 }
    );
  }
}

