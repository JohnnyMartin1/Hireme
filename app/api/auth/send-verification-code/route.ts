import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiration

    console.log('Generated verification code for:', email, 'Code:', code);

    // Store code in database using Admin SDK
    await adminDb.collection('verificationCodes').add({
      email,
      code,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      used: false
    });

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'HireMe <onboarding@resend.dev>',
      to: [email],
      subject: 'Your HireMe verification code',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #000080 0%, #2563EB 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                HireMe Verification Code
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; text-align: center;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Your verification code is:
              </p>
              
              <!-- Code Display -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; display: inline-block;">
                <h2 style="margin: 0; color: #000080; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">
                  ${code}
                </h2>
              </div>

              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Enter this code in the verification field to continue with your account setup.
              </p>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This code will expire in <strong>10 minutes</strong> for security reasons.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                <strong>Didn't request this code?</strong><br>
                If you didn't sign up for HireMe, you can safely ignore this email.
              </p>
              
              <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
                © ${new Date().getFullYear()} HireMe. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `Your HireMe verification code is: ${code}

Enter this code in the verification field to continue with your account setup.

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.

© ${new Date().getFullYear()} HireMe. All rights reserved.
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent successfully' 
    });

  } catch (error: any) {
    console.error('Error in send-verification-code API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
