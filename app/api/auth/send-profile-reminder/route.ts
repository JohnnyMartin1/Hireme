import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const profileUrl = `${baseUrl}/account/profile`;
    const displayName = firstName || email.split('@')[0];

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'HireMe <onboarding@resend.dev>',
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
                Thanks for signing up for HireMe! We noticed you skipped the profile setup step on mobile. 
                No worries — completing your profile is much easier on a computer, and it only takes a few minutes!
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                A complete profile helps employers discover your amazing potential. You can add:
              </p>

              <ul style="margin: 20px 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.8;">
                <li>Your skills and experience</li>
                <li>Work preferences and job types</li>
                <li>Professional links (LinkedIn, portfolio)</li>
                <li>Resume and profile video</li>
                <li>And much more!</li>
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
                If you have any questions about completing your profile, feel free to reach out to our support team.
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

Thanks for signing up for HireMe! We noticed you skipped the profile setup step on mobile. No worries — completing your profile is much easier on a computer, and it only takes a few minutes!

A complete profile helps employers discover your amazing potential. You can add your skills, experience, work preferences, professional links, resume, and much more.

Complete your profile here: ${profileUrl}

Questions? If you have any questions about completing your profile, feel free to reach out to our support team.

© ${new Date().getFullYear()} HireMe. All rights reserved.
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send reminder email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Reminder email sent successfully' 
    });

  } catch (error: any) {
    console.error('Error in send-profile-reminder API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reminder email' },
      { status: 500 }
    );
  }
}
