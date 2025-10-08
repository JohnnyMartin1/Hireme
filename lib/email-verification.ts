import { Resend } from 'resend';
import { adminDb } from './firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a random verification token
function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Create verification token in database
export async function createVerificationToken(userId: string, email: string) {
  try {
    const token = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    // Use Admin SDK to bypass security rules
    await adminDb.collection('emailVerificationTokens').add({
      userId,
      email,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      used: false
    });

    return token;
  } catch (error: any) {
    console.error('Firestore error creating verification token:', error);
    throw new Error(`Failed to create verification token: ${error.message}`);
  }
}

// Send verification email via Resend
export async function sendVerificationEmailViaResend(email: string, token: string, userName?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;

  const displayName = userName || email.split('@')[0];

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'HireMe <onboarding@resend.dev>',
      to: [email],
      subject: 'Verify your email - HireMe',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Welcome to HireMe! 🎉
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${displayName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for HireMe! We're excited to have you on board. To get started, please verify your email address by clicking the button below.
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 20px; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; color: #4b5563; font-size: 13px; word-break: break-all;">
                ${verifyUrl}
              </p>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This link will expire in <strong>24 hours</strong> for security reasons.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                <strong>Didn't create an account?</strong><br>
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
      text: `Welcome to HireMe!

Hi ${displayName},

Thanks for signing up! Please verify your email address by visiting this link:

${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} HireMe. All rights reserved.
      `
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send verification email');
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Verify email with token
export async function verifyEmailWithToken(token: string) {
  try {
    // Find the token in database using Admin SDK
    const tokensSnapshot = await adminDb
      .collection('emailVerificationTokens')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (tokensSnapshot.empty) {
      return { success: false, error: 'Invalid verification token' };
    }

    const tokenDoc = tokensSnapshot.docs[0];
    const tokenData = tokenDoc.data();

    // Check if already used
    if (tokenData.used) {
      return { success: false, error: 'This verification link has already been used' };
    }

    // Check if expired
    const expiresAt = new Date(tokenData.expiresAt);
    if (expiresAt < new Date()) {
      return { success: false, error: 'This verification link has expired' };
    }

    // Mark token as used using Admin SDK
    await tokenDoc.ref.update({
      used: true,
      usedAt: new Date().toISOString()
    });

    // Update user's emailVerified status in Firestore using Admin SDK
    await adminDb.collection('users').doc(tokenData.userId).update({
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString()
    });

    return { 
      success: true, 
      userId: tokenData.userId,
      email: tokenData.email 
    };
  } catch (error: any) {
    console.error('Error verifying token:', error);
    return { success: false, error: error.message };
  }
}

// Resend verification email
export async function resendVerificationEmail(userId: string, email: string, userName?: string) {
  try {
    // Delete old tokens for this user using Admin SDK
    const oldTokensSnapshot = await adminDb
      .collection('emailVerificationTokens')
      .where('userId', '==', userId)
      .get();

    // Delete all old tokens
    const deletePromises = oldTokensSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    // Create new token
    const token = await createVerificationToken(userId, email);

    // Send email
    await sendVerificationEmailViaResend(email, token, userName);

    return { success: true };
  } catch (error: any) {
    console.error('Error resending verification email:', error);
    return { success: false, error: error.message };
  }
}

