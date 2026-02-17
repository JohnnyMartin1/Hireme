import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { calculateCompletion } from '@/components/ProfileCompletionProvider';
import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to get email from address
function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (from && from !== 'your_email@example.com') {
    return from;
  }
  return 'HireMe <onboarding@resend.dev>';
}

// Send reminder email
async function sendReminderEmail(email: string, firstName: string | undefined, profileUrl: string) {
  const displayName = firstName || email.split('@')[0];
  const emailFrom = getEmailFrom();

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: [email],
    subject: 'Complete Your HireMe Profile',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Profile</title>
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
                Complete Your Profile
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
                Thanks for signing up for HireMe! We noticed your profile isn't complete yet. 
                Completing your profile helps employers discover your amazing potential and increases your visibility.
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                A complete profile (70%+) helps you:
              </p>

              <ul style="margin: 20px 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.8;">
                <li>Get discovered by top employers</li>
                <li>Showcase your skills and experience</li>
                <li>Stand out from other candidates</li>
                <li>Increase your job opportunities</li>
              </ul>

              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" 
                       style="display: inline-block; background-color: #000080; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Complete Your Profile
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${profileUrl}" style="color: #2563EB; word-break: break-all;">${profileUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                <strong>Questions?</strong><br>
                If you have any questions about completing your profile, feel free to reach out to our support team at support@officialhireme.com
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
    text: `Hi ${displayName},

Thanks for signing up for HireMe! We noticed your profile isn't complete yet. Completing your profile helps employers discover your amazing potential and increases your visibility.

A complete profile (70%+) helps you get discovered by top employers, showcase your skills and experience, stand out from other candidates, and increase your job opportunities.

Complete your profile here: ${profileUrl}

Questions? If you have any questions about completing your profile, feel free to reach out to our support team at support@officialhireme.com

© ${new Date().getFullYear()} HireMe. All rights reserved.
    `
  });

  return { data, error };
}

export async function GET(request: NextRequest) {
  // Verify this is a cron request (Vercel Cron sends a secret header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all job seekers
    const usersSnapshot = await adminDb
      .collection('users')
      .where('role', '==', 'JOB_SEEKER')
      .get();

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      const userId = doc.id;
      
      // Skip if no email
      if (!user.email) {
        skippedCount++;
        continue;
      }

      // Calculate profile completion
      const completion = calculateCompletion(user);
      
      // Skip if already 70%+ complete
      if (completion >= 70) {
        skippedCount++;
        continue;
      }

      // Parse createdAt
      let createdAt: Date;
      if (user.createdAt?.toDate) {
        createdAt = user.createdAt.toDate();
      } else if (user.createdAt) {
        createdAt = new Date(user.createdAt);
      } else {
        skippedCount++;
        continue;
      }

      // Check if reminder was already sent today
      const lastReminderSent = user.lastProfileReminderSent;
      let lastReminderDate: Date | null = null;
      
      if (lastReminderSent) {
        if (lastReminderSent.toDate) {
          lastReminderDate = lastReminderSent.toDate();
        } else {
          lastReminderDate = new Date(lastReminderSent);
        }
      }

      // Skip if reminder was already sent today
      if (lastReminderDate && lastReminderDate >= todayStart) {
        skippedCount++;
        continue;
      }

      // Check if user is eligible for reminder
      const hoursSinceSignup = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const daysSinceSignup = hoursSinceSignup / 24;

      let shouldSend = false;

      // First reminder: 3 hours after signup (but only send once)
      if (hoursSinceSignup >= 3 && hoursSinceSignup < 24 && !lastReminderDate) {
        shouldSend = true;
      }
      // Daily reminders at 3pm EST (20:00 UTC): once per day after first day
      else if (daysSinceSignup >= 1) {
        const currentHourUTC = now.getUTCHours();
        const is3pmEST = currentHourUTC === 20; // 3pm EST = 20:00 UTC (or 4pm EDT = 20:00 UTC)
        
        // Only send daily reminder at exactly 3pm EST (20:00 UTC)
        if (is3pmEST && (!lastReminderDate || lastReminderDate < todayStart)) {
          shouldSend = true;
        }
      }

      if (!shouldSend) {
        skippedCount++;
        continue;
      }

      // Send reminder email
      try {
        const profileUrl = `${baseUrl}/account/profile`;
        const { error: emailError } = await sendReminderEmail(
          user.email,
          user.firstName,
          profileUrl
        );

        if (emailError) {
          errors.push(`${user.email}: ${emailError}`);
          continue;
        }

        // Update last reminder sent timestamp
        await adminDb.collection('users').doc(userId).update({
          lastProfileReminderSent: FieldValue.serverTimestamp()
        });

        sentCount++;
      } catch (error: any) {
        errors.push(`${user.email}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('Error in profile reminders cron:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process reminders' },
      { status: 500 }
    );
  }
}
