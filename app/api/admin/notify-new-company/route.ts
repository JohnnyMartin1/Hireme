import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { companyName, contactName, contactEmail, companySize, industry } = await request.json();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const adminUrl = `${baseUrl}/admin/login?redirect=/admin/verify-companies`;
    const companyProfileUrl = `${baseUrl}/company/${request.headers.get('x-user-id') || 'unknown'}`;

    const fromEmail = process.env.EMAIL_FROM || 'HireMe <onboarding@resend.dev>';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hireme.com';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject: `New Company Registration: ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Company Registration</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                        🏢 New Company Registration
                      </h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                        A new company has registered on HireMe and is awaiting verification.
                      </p>
                      
                      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">Company Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 30%;">Company Name:</td>
                            <td style="padding: 8px 0; color: #6b7280;">${companyName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #374151; font-weight: 600;">Contact Person:</td>
                            <td style="padding: 8px 0; color: #6b7280;">${contactName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #374151; font-weight: 600;">Email:</td>
                            <td style="padding: 8px 0; color: #6b7280;">${contactEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #374151; font-weight: 600;">Industry:</td>
                            <td style="padding: 8px 0; color: #6b7280;">${industry}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #374151; font-weight: 600;">Company Size:</td>
                            <td style="padding: 8px 0; color: #6b7280;">${companySize}</td>
                          </tr>
                        </table>
                      </div>

                      <!-- Action Buttons -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <table role="presentation" style="border-collapse: separate; border-spacing: 10px;">
                              <tr>
                                <td>
                                  <a href="${adminUrl}" style="display: inline-block; padding: 16px 30px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);">
                                    Review & Approve
                                  </a>
                                </td>
                                <td>
                                  <a href="${companyProfileUrl}" style="display: inline-block; padding: 16px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                                    View Company Profile
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        This company cannot access employer features until you approve their registration.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
                        © ${new Date().getFullYear()} HireMe Admin Panel. This is an automated notification.
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
      text: `New Company Registration: ${companyName}

A new company has registered on HireMe and is awaiting verification.

Company Details:
- Company Name: ${companyName}
- Contact Person: ${contactName}
- Email: ${contactEmail}
- Industry: ${industry}
- Company Size: ${companySize}

Quick Actions:
- Review & Approve: ${adminUrl}
- View Company Profile: ${companyProfileUrl}

This company cannot access employer features until you approve their registration.

© ${new Date().getFullYear()} HireMe Admin Panel`
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send admin notification');
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error: any) {
    console.error('Error sending admin notification:', error);
    return NextResponse.json({ 
      error: 'Failed to send admin notification',
      details: error.message 
    }, { status: 500 });
  }
}
