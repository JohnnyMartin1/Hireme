import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';

// Initialize Resend instance once (singleton pattern for better performance)
let resendInstance: Resend | null = null;
const getResendInstance = () => {
  if (resendInstance) {
    return resendInstance; // Return cached instance
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set in environment variables');
    return null;
  }
  resendInstance = new Resend(apiKey);
  return resendInstance;
};

// Pre-determine which email address to use (avoid checking env every time)
const getEmailFrom = () => {
  const customFrom = process.env.EMAIL_FROM;
  // If custom domain is set but might fail, use default immediately
  // Otherwise use custom if available
  return customFrom || 'HireMe <onboarding@resend.dev>';
};

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple in-memory rate limiting (prevents excessive email sends)
const emailRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(email: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const key = email.toLowerCase();
  const limit = emailRateLimit.get(key);

  // Reset if past the time window (1 minute)
  if (!limit || now > limit.resetTime) {
    emailRateLimit.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return { allowed: true };
  }

  // Allow max 3 emails per minute per email address
  if (limit.count >= 3) {
    const secondsLeft = Math.ceil((limit.resetTime - now) / 1000);
    return { 
      allowed: false, 
      message: `Please wait ${secondsLeft} seconds before requesting another code. Too many requests.` 
    };
  }

  limit.count++;
  return { allowed: true };
}

// Email template (cached year to avoid Date() calls in template)
const CURRENT_YEAR = new Date().getFullYear();

// Email template
function getEmailTemplate(code: string) {
  return {
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
              
              <!-- Hidden text for browser autofill (Web OTP API) -->
              <p style="margin: 20px 0 0; color: transparent; font-size: 1px; line-height: 1px; opacity: 0; position: absolute; left: -9999px;">
                @hireme.com #${code}
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
                © ${CURRENT_YEAR} HireMe. All rights reserved.
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

© ${CURRENT_YEAR} HireMe. All rights reserved.

Your verification code: ${code}
@hireme.com #${code}
    `
  };
}

// Fallback function to try sending with default Resend domain (optimized for speed)
async function tryFallbackEmail(resend: InstanceType<typeof Resend>, email: string, code: string) {
  const defaultEmailFrom = 'HireMe <onboarding@resend.dev>';
  const template = getEmailTemplate(code);
  
  const result = await resend.emails.send({
    from: defaultEmailFrom,
    to: [email],
    subject: 'Your HireMe verification code',
    html: template.html,
    text: template.text
  });

  if (result.error || !result.data) {
    return NextResponse.json(
      { 
        error: 'Failed to send verification email',
        details: result.error?.message || 'Email service error'
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ 
    success: true,
    message: 'Verification code sent successfully' 
  });
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

    // Check rate limit to prevent excessive email sends
    const rateLimitCheck = checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      console.warn('Rate limit exceeded for:', email);
      return NextResponse.json(
        { error: rateLimitCheck.message || 'Too many requests. Please wait before requesting another code.' },
        { status: 429 }
      );
    }

    // Generate 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiration

    // Check if Resend is configured first
    const resend = getResendInstance();
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Prepare email template and from address upfront (before async operations)
    const template = getEmailTemplate(code);
    const emailFrom = getEmailFrom();
    
    // Store in database in background FIRST (fire and forget - don't wait)
    adminDb.collection('verificationCodes').add({
      email,
      code,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      used: false
    }).catch(() => {
      // Silently fail - email sending is more important than DB logging
    });
    
    // Send email immediately - don't wait for database write
    const emailResult = await resend.emails.send({
      from: emailFrom,
      to: [email],
      subject: 'Your HireMe verification code',
      html: template.html,
      text: template.text
    });

    // Check email result directly
    const { data, error } = emailResult;

    // Resend returns { data, error } structure - check for error
    if (error) {
      // If custom domain failed, try default domain (fast fallback)
      const customEmailFrom = process.env.EMAIL_FROM;
      const errorAny = error as any;
      if (customEmailFrom && (error.message?.includes('domain') || error.message?.includes('verify') || errorAny.statusCode === 403)) {
        return await tryFallbackEmail(resend, email, code);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to send verification email',
          details: error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (!data) {
      // Try fallback if no data returned
      return await tryFallbackEmail(resend, email, code);
    }

    // Success! Return immediately - email is queued for sending
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
